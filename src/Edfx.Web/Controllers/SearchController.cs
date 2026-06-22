using System.Text.Json;
using Edfx.ApiClient;
using Edfx.Domain;
using Microsoft.AspNetCore.Mvc;

namespace Edfx.Web.Controllers;

/// <summary>One monthly point in the PD / implied-rating history.</summary>
public record PdPoint
{
    public string? Date { get; init; }          // asOfDate (YYYY-MM-DD)
    public double? Pd { get; init; }
    public string? ImpliedRating { get; init; }
}

/// <summary>One tenor point of the PD term structure.</summary>
public record TermPoint
{
    public string Tenor { get; init; } = "";    // e.g. "1y"
    public double? Forward { get; init; }
    public double? Cumulative { get; init; }
}

/// <summary>Summary KPIs + history + term structure for the entity detail page.</summary>
public record EntitySummaryDto
{
    public string EntityId { get; init; } = "";
    public string? Name { get; init; }
    public string? AsOfDate { get; init; }
    public double? Pd { get; init; }            // probability (e.g. 0.0019)
    public string? ImpliedRating { get; init; }
    public string? Ews { get; init; }           // risk category: Low/Medium/High/Severe
    public string? EwsChange { get; init; }     // Deteriorated / Improved / No Change
    public double? Trigger { get; init; }        // EWS trigger PD level (point-in-time)
    public string? Confidence { get; init; }      // model/quality code, e.g. "P-G-R"
    public string? Model { get; init; }           // confidenceDescription, e.g. "Public firm, CreditEdge model..."
    public List<PdPoint> PdHistory { get; init; } = new();
    public List<TermPoint> TermStructure { get; init; } = new();
}

/// <summary>Financial statement + ratios passthrough for the Financials section.</summary>
public record FinancialsDto
{
    public JsonElement? Statement { get; init; }
    public JsonElement? Ratios { get; init; }
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

        double? pd = null, trigger = null; string? rating = null, asOf = null, ews = null, ewsChange = null;
        string? confidence = null, model = null;
        var history = new List<PdPoint>();
        var term = new List<TermPoint>();

        // Pull a 12-month monthly history so the trend charts can be driven live.
        var startDate = DateTime.UtcNow.AddMonths(-12).ToString("yyyy-MM-dd");
        var endDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var (pdRaw, pdStatus) = await _client.ExtractAsync("pds", new[] { id }, startDate, endDate, "monthly");
        if (pdStatus is >= 200 and < 300 && FirstEntity(pdRaw) is { } pe)
        {
            pd = Dbl(pe, "pd");
            rating = Str(pe, "impliedRating");
            asOf = Str(pe, "asOfDate");
            confidence = Str(pe, "confidence");
            model = Str(pe, "confidenceDescription");
            if (pe.TryGetProperty("history", out var hist) && hist.ValueKind == JsonValueKind.Array)
                foreach (var h in hist.EnumerateArray())
                    history.Add(new PdPoint { Date = Str(h, "asOfDate"), Pd = Dbl(h, "pd"), ImpliedRating = Str(h, "impliedRating") });
            // PD term structure: forwardNy / cumulativeNy for tenors 1..10
            if (pe.TryGetProperty("termStructure", out var ts))
            {
                ts.TryGetProperty("forward", out var fwd);
                ts.TryGetProperty("cumulative", out var cum);
                for (var y = 1; y <= 10; y++)
                {
                    var f = fwd.ValueKind == JsonValueKind.Object ? Dbl(fwd, $"forward{y}y") : null;
                    var c = cum.ValueKind == JsonValueKind.Object ? Dbl(cum, $"cumulative{y}y") : null;
                    if (f != null || c != null) term.Add(new TermPoint { Tenor = $"{y}y", Forward = f, Cumulative = c });
                }
            }
        }

        var (rcRaw, rcStatus) = await _client.ExtractAsync("risk_category", new[] { id });
        if (rcStatus is >= 200 and < 300 && FirstEntity(rcRaw) is { } re)
        {
            ews = Str(re, "riskCategory");
            trigger = Dbl(re, "trigger");
            if (re.TryGetProperty("irChange", out var ir) && ir.TryGetInt32(out var irChange))
                ewsChange = irChange < 0 ? "Deteriorated" : irChange > 0 ? "Improved" : "No Change";
        }

        return new EntitySummaryDto
        {
            EntityId = id, Name = name, AsOfDate = asOf,
            Pd = pd, ImpliedRating = rating, Ews = ews, EwsChange = ewsChange,
            Trigger = trigger, Confidence = confidence, Model = model,
            PdHistory = history, TermStructure = term,
        };
    }

    /// <summary>Firmographic profile (identifiers, industry, location) via EDF-X search.</summary>
    [HttpGet("{id}/profile")]
    public async Task<ActionResult<EntitySummary>> Profile(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return BadRequest();
        var (search, _) = await _client.SearchAsync(id, 1);
        return search.Entities.FirstOrDefault() ?? new EntitySummary { EntityId = id };
    }

    /// <summary>Latest financial statement + ratios for the Financials section.</summary>
    [HttpGet("{id}/financials")]
    public async Task<ActionResult<FinancialsDto>> Financials(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return BadRequest();
        var (sRaw, sStatus) = await _client.ExtractAsync("statements", new[] { id });
        var (rRaw, rStatus) = await _client.ExtractAsync("ratios", new[] { id });
        return new FinancialsDto
        {
            Statement = sStatus is >= 200 and < 300 ? FirstArrayItem(sRaw, "statements") : null,
            Ratios = rStatus is >= 200 and < 300 ? FirstArrayItem(rRaw, "ratios") : null,
        };
    }

    // entities[0].<prop>[0] — the latest statement/ratios record.
    private static JsonElement? FirstArrayItem(string raw, string prop)
    {
        if (FirstEntity(raw) is not { } e) return null;
        if (e.TryGetProperty(prop, out var arr) && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0)
            return arr[0].Clone();
        return null;
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

    private static double? Dbl(JsonElement e, string prop)
    {
        if (!e.TryGetProperty(prop, out var v)) return null;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var n)) return n;
        if (v.ValueKind == JsonValueKind.String && double.TryParse(v.GetString(),
                System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var s)) return s;
        return null;
    }
}
