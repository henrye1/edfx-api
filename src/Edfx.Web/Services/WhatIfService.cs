using System.Globalization;
using System.Text;
using System.Text.Json;
using Edfx.ApiClient;

namespace Edfx.Web.Services;

public record WhatIfResult
{
    public string Status { get; init; } = "";   // completed | failed | error
    public double? Pd { get; init; }
    public string? ImpliedRating { get; init; }
    public string? AsOfDate { get; init; }
    public string? Error { get; init; }
}

/// <summary>
/// Runs a "what-if" recalculation: takes an entity's real financial statement,
/// applies user overrides, uploads the row to /entities/modelInputs, polls the
/// process, and returns the recomputed PD via the resulting processId.
/// </summary>
public class WhatIfService
{
    private readonly IEdfxClient _client;
    private readonly HttpClient _http;
    public WhatIfService(IEdfxClient client, HttpClient http) { _client = client; _http = http; }

    public async Task<WhatIfResult> ComputeAsync(string entityId, IDictionary<string, double> overrides, CancellationToken ct = default)
    {
        // 1. Template column order.
        var header = Encoding.UTF8.GetString(await _client.DownloadTemplateAsync("universal"))
            .Split('\n')[0].Trim().TrimEnd('\r');
        var cols = header.Split(',');

        // 2. The entity's real latest statement.
        var (sRaw, _) = await _client.ExtractAsync("statements", new[] { entityId });
        if (FirstStatement(sRaw) is not { } stmt)
            return new WhatIfResult { Status = "error", Error = "No financial statement available for this entity." };
        var flat = FlattenNumbers(stmt);

        // 3. Identifiers / classification codes.
        var (search, _) = await _client.SearchAsync(entityId, 1);
        var e = search.Entities.FirstOrDefault();

        // 4. Build the CSV row: real values, then overrides, then mandatory metadata.
        var row = cols.ToDictionary(c => c, _ => "");
        foreach (var (k, v) in flat) if (row.ContainsKey(k)) row[k] = v.ToString(CultureInfo.InvariantCulture);
        foreach (var (k, v) in overrides) if (row.ContainsKey(k)) row[k] = v.ToString(CultureInfo.InvariantCulture);
        Set(row, "entityIdentifierbvd", e?.IdentifierBvd ?? entityId);
        Set(row, "entityInternationalName", (e?.InternationalName ?? "Entity").Replace(' ', '_'));
        Set(row, "financialStatementDate", Str(stmt, "financialStatementDate"));
        Set(row, "asOfDate", DateTime.UtcNow.ToString("yyyy-MM-dd"));
        Set(row, "primaryIndustryClassification", "NDY");
        Set(row, "primaryIndustry", e?.PrimaryIndustryNDY);
        Set(row, "primaryCountry", e?.ContactCountryCode);
        Set(row, "currency", Str(stmt, "currency"));
        Set(row, "entityType", string.IsNullOrEmpty(e?.EntityType) ? "Corporate" : e!.EntityType);

        var csv = new StringBuilder().AppendJoin(',', cols).Append('\n')
            .AppendJoin(',', cols.Select(c => row[c])).Append('\n').ToString();

        // 5. Upload.
        var (upRaw, upStatus) = await _client.UploadModelInputsAsync(Encoding.UTF8.GetBytes(csv), "whatif.csv");
        if (upStatus is < 200 or >= 300) return new WhatIfResult { Status = "error", Error = $"Upload failed (HTTP {upStatus})." };
        if (JsonProp(upRaw, "processId") is not { } processId)
            return new WhatIfResult { Status = "error", Error = "Upload did not return a processId." };

        // 6. Poll until the calculation completes or fails.
        string? errorFile = null;
        for (var i = 0; i < 25; i++)
        {
            var (stRaw, _) = await _client.ProcessStatusAsync(processId);
            var status = JsonProp(stRaw, "status") ?? "";
            if (status.Equals("Completed", StringComparison.OrdinalIgnoreCase) || status.Equals("Succeeded", StringComparison.OrdinalIgnoreCase))
            {
                var (pdRaw, _) = await _client.PostRawAsync("entities/pds", new { processId });
                if (FirstEntity(pdRaw) is not { } pe)
                    return new WhatIfResult { Status = "failed", Error = "No PD returned for the recomputed inputs." };
                return new WhatIfResult { Status = "completed", Pd = Dbl(pe, "pd"), ImpliedRating = Str(pe, "impliedRating"), AsOfDate = Str(pe, "asOfDate") };
            }
            if (status.Equals("Failed", StringComparison.OrdinalIgnoreCase)) { errorFile = JsonProp(stRaw, "errorFile"); break; }
            await Task.Delay(2000, ct);
        }
        return new WhatIfResult { Status = "failed", Error = await ReadErrorAsync(errorFile, ct) ?? "Recalculation failed or timed out." };
    }

    private static void Set(Dictionary<string, string> row, string key, string? value)
    {
        if (row.ContainsKey(key) && !string.IsNullOrEmpty(value)) row[key] = value;
    }

    private async Task<string?> ReadErrorAsync(string? url, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(url)) return null;
        try
        {
            var text = await _http.GetStringAsync(url, ct);
            var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length > 1) return lines[1].Split(',').LastOrDefault()?.Trim();
        }
        catch { /* best effort */ }
        return null;
    }

    private static JsonElement? FirstStatement(string raw)
    {
        if (FirstEntity(raw) is not { } e) return null;
        return e.TryGetProperty("statements", out var arr) && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0
            ? arr[0].Clone() : null;
    }

    private static Dictionary<string, double> FlattenNumbers(JsonElement obj)
    {
        var d = new Dictionary<string, double>();
        void Walk(JsonElement el)
        {
            foreach (var p in el.EnumerateObject())
            {
                if (p.Value.ValueKind == JsonValueKind.Number && p.Value.TryGetDouble(out var n)) d[p.Name] = n;
                else if (p.Value.ValueKind == JsonValueKind.Object) Walk(p.Value);
            }
        }
        if (obj.ValueKind == JsonValueKind.Object) Walk(obj);
        return d;
    }

    private static JsonElement? FirstEntity(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("entities", out var arr) && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0)
                return arr[0].Clone();
        }
        catch (JsonException) { }
        return null;
    }

    private static string? JsonProp(string raw, string prop)
    {
        try { using var doc = JsonDocument.Parse(raw); return doc.RootElement.TryGetProperty(prop, out var v) ? v.ToString() : null; }
        catch (JsonException) { return null; }
    }

    private static string? Str(JsonElement e, string prop)
        => e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static double? Dbl(JsonElement e, string prop)
        => e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var n) ? n : null;
}
