using System.Text.Json;
using Edfx.ApiClient;
using Edfx.Domain;
using Microsoft.AspNetCore.Mvc;

namespace Edfx.Web.Controllers;

/// <summary>Summary KPIs for the entity detail page (live EDF-X or mock).</summary>
public record EntitySummaryDto
{
    public string EntityId { get; init; } = "";
    public string? Name { get; init; }
    public string? AsOfDate { get; init; }
    public double? Pd { get; init; }            // probability (e.g. 0.0019)
    public string? ImpliedRating { get; init; }
    public string? Ews { get; init; }           // risk category: Low/Medium/High/Severe
    public string? EwsChange { get; init; }     // Deteriorated / Improved / No Change
}

[ApiController]
[Route("api/entities")]
public class SearchController : ControllerBase
{
    private readonly IEdfxClient _client;

    public SearchController(IEdfxClient client) { _client = client; }

    /// <summary>
    /// Entity search for the Add Company picker. Returns the matching entities
    /// from EDF-X (live mode) or sample data (mock mode).
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<EntitySearchResponse>> Search([FromQuery] string query, [FromQuery] int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return new EntitySearchResponse();

        var (response, _) = await _client.SearchAsync(query.Trim(), limit);
        return response;
    }

    /// <summary>
    /// Live summary KPIs (PD, implied rating, early-warning) for one entity,
    /// aggregated from the pds and riskCategory endpoints.
    /// </summary>
    [HttpGet("{id}/summary")]
    public async Task<ActionResult<EntitySummaryDto>> Summary(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return BadRequest();

        // Name via search (EDF-X search accepts the entity identifier directly).
        string? name = null;
        var (search, _) = await _client.SearchAsync(id, 1);
        name = search.Entities.FirstOrDefault()?.InternationalName;

        double? pd = null; string? rating = null, asOf = null, ews = null, ewsChange = null;

        var (pdRaw, pdStatus) = await _client.ExtractAsync("pds", new[] { id });
        if (pdStatus is >= 200 and < 300 && FirstEntity(pdRaw) is { } pe)
        {
            if (pe.TryGetProperty("pd", out var pdEl) && pdEl.TryGetDouble(out var pdVal)) pd = pdVal;
            rating = Str(pe, "impliedRating");
            asOf = Str(pe, "asOfDate");
        }

        var (rcRaw, rcStatus) = await _client.ExtractAsync("risk_category", new[] { id });
        if (rcStatus is >= 200 and < 300 && FirstEntity(rcRaw) is { } re)
        {
            ews = Str(re, "riskCategory");
            if (re.TryGetProperty("irChange", out var ir) && ir.TryGetInt32(out var irChange))
                ewsChange = irChange < 0 ? "Deteriorated" : irChange > 0 ? "Improved" : "No Change";
        }

        return new EntitySummaryDto
        {
            EntityId = id, Name = name, AsOfDate = asOf,
            Pd = pd, ImpliedRating = rating, Ews = ews, EwsChange = ewsChange,
        };
    }

    private static JsonElement? FirstEntity(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("entities", out var arr)
                && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0)
                return arr[0].Clone();
        }
        catch (JsonException) { }
        return null;
    }

    private static string? Str(JsonElement e, string prop)
        => e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}
