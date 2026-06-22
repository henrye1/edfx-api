using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using Edfx.ApiClient;
using Edfx.Web.Controllers; // TermPoint

namespace Edfx.Web.Services;

public record NamedValue(string Label, double? Value);
public record FinGroup(string Group, List<NamedValue> Items);

public record UploadScoreResult
{
    public string Status { get; init; } = "";  // completed | failed | error
    public string? Error { get; init; }
    public string? EntityName { get; init; }
    public string? AsOfDate { get; init; }
    public double? PitPd { get; init; }         // CCA (point-in-time)
    public double? TtcPd { get; init; }         // FSO (through-the-cycle-like)
    public string? ImpliedRating { get; init; }
    public string? Confidence { get; init; }
    public string? Model { get; init; }
    public List<TermPoint> TermStructure { get; init; } = new();
    public List<FinGroup> Financials { get; init; } = new();   // provided inputs (model drivers)
    public List<NamedValue> Ratios { get; init; } = new();     // key ratios derived from inputs
}

/// <summary>
/// Scores an uploaded financials file (CSV or Excel) via the EDF-X modelInputs flow,
/// returning the provided inputs (drivers), derived ratios, and both PIT (CCA) and
/// TTC (FSO) PDs.
/// </summary>
public class UploadScoreService
{
    private readonly IEdfxClient _client;
    private readonly HttpClient _http;
    public UploadScoreService(IEdfxClient client, HttpClient http) { _client = client; _http = http; }

    private static readonly HashSet<string> Meta = new(StringComparer.OrdinalIgnoreCase)
    {
        "entityInternationalName","entityIdentifierbvd","financialStatementDate","asOfDate",
        "primaryIndustryClassification","primaryIndustry","primaryCountry","primaryStateProvince",
        "currency","entityLegalForm","auditQuality","entityType","entityStatus","entityStatusDate",
    };

    public async Task<UploadScoreResult> ScoreAsync(byte[] file, string fileName, CancellationToken ct = default)
    {
        string csv;
        try { csv = fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) || fileName.EndsWith(".xls", StringComparison.OrdinalIgnoreCase) ? ExcelToCsv(file) : Encoding.UTF8.GetString(file); }
        catch (Exception ex) { return new UploadScoreResult { Status = "error", Error = "Could not read the file: " + ex.Message }; }

        var lines = csv.Replace("\r", "").Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length < 2) return new UploadScoreResult { Status = "error", Error = "File has no data row beneath the header." };
        var header = lines[0].Split(',');
        var cells = lines[1].Split(',');
        var inputs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < header.Length && i < cells.Length; i++) inputs[header[i].Trim()] = cells[i].Trim();

        // Upload (CSV bytes) and poll.
        var (upRaw, upStatus) = await _client.UploadModelInputsAsync(Encoding.UTF8.GetBytes(csv), "upload.csv");
        if (upStatus is < 200 or >= 300) return new UploadScoreResult { Status = "error", Error = $"Upload failed (HTTP {upStatus})." };
        if (JsonProp(upRaw, "processId") is not { } processId) return new UploadScoreResult { Status = "error", Error = "Upload did not return a processId." };

        string? errorFile = null; var completed = false;
        for (var i = 0; i < 25; i++)
        {
            var (stRaw, _) = await _client.ProcessStatusAsync(processId);
            var status = JsonProp(stRaw, "status") ?? "";
            if (status.Equals("Completed", StringComparison.OrdinalIgnoreCase) || status.Equals("Succeeded", StringComparison.OrdinalIgnoreCase)) { completed = true; break; }
            if (status.Equals("Failed", StringComparison.OrdinalIgnoreCase)) { errorFile = JsonProp(stRaw, "errorFile"); break; }
            await Task.Delay(2000, ct);
        }
        if (!completed) return new UploadScoreResult { Status = "failed", Error = await ReadErrorAsync(errorFile, ct) ?? "Scoring failed or timed out.", Financials = BuildFinancials(header, inputs) };

        // PIT (CCA, default) and TTC (FSO=true).
        var (pitRaw, _) = await _client.PostRawAsync("entities/pds", new { processId });
        var (ttcRaw, _) = await _client.PostRawAsync("entities/pds", new { processId, modelParameters = new { fso = true } });
        var pit = FirstEntity(pitRaw);
        var ttc = FirstEntity(ttcRaw);

        return new UploadScoreResult
        {
            Status = "completed",
            EntityName = inputs.GetValueOrDefault("entityInternationalName"),
            AsOfDate = pit is { } p ? Str(p, "asOfDate") : null,
            PitPd = pit is { } p2 ? Dbl(p2, "pd") : null,
            TtcPd = ttc is { } t ? Dbl(t, "pd") : null,
            ImpliedRating = pit is { } p3 ? Str(p3, "impliedRating") : null,
            Confidence = pit is { } p4 ? Str(p4, "confidence") : null,
            Model = pit is { } p5 ? Str(p5, "confidenceDescription") : null,
            TermStructure = pit is { } p6 ? TermStructure(p6) : new(),
            Financials = BuildFinancials(header, inputs),
            Ratios = ComputeRatios(inputs),
        };
    }

    private static string ExcelToCsv(byte[] file)
    {
        using var wb = new XLWorkbook(new MemoryStream(file));
        var ws = wb.Worksheets.First();
        var sb = new StringBuilder();
        foreach (var row in ws.RangeUsed()!.RowsUsed())
            sb.AppendJoin(',', row.Cells().Select(c => c.GetValue<string>().Replace(",", " "))).Append('\n');
        return sb.ToString();
    }

    private static List<FinGroup> BuildFinancials(string[] header, Dictionary<string, string> inputs)
    {
        var items = new List<NamedValue>();
        foreach (var col in header)
        {
            var name = col.Trim();
            if (Meta.Contains(name)) continue;
            if (inputs.TryGetValue(name, out var raw) && double.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var v))
                items.Add(new NamedValue(name, v));
        }
        return items.Count > 0 ? new List<FinGroup> { new("Provided financial inputs (model drivers)", items) } : new();
    }

    private static List<NamedValue> ComputeRatios(Dictionary<string, string> inputs)
    {
        double? N(string k) => inputs.TryGetValue(k, out var s) && double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : null;
        double? Ratio(string a, string b) { var x = N(a); var y = N(b); return x != null && y is not null and not 0 ? x / y : null; }
        var list = new List<NamedValue>
        {
            new("Current Ratio", Ratio("totalCurrentAssets", "totalCurrentLiabilities")),
            new("Total Liabilities / Total Assets", Ratio("totalLiabilities", "totalAssets")),
            new("Total Debt / Total Assets", Ratio("totalDebt", "totalAssets")),
            new("Gross Margin", Ratio("grossIncome", "netSales")),
            new("Operating Margin", Ratio("totalOperatingProfit", "netSales")),
            new("Net Profit Margin", Ratio("netIncome", "netSales")),
        };
        return list.Where(r => r.Value != null).ToList();
    }

    private async Task<string?> ReadErrorAsync(string? url, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(url)) return null;
        try
        {
            var text = await _http.GetStringAsync(url, ct);
            var rows = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (rows.Length > 1) return rows[1].Split(',').LastOrDefault()?.Trim();
        }
        catch { /* best effort */ }
        return null;
    }

    private static List<TermPoint> TermStructure(JsonElement e)
    {
        var term = new List<TermPoint>();
        if (e.TryGetProperty("termStructure", out var ts))
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
        return term;
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
        => e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var n) ? n
           : e.TryGetProperty(prop, out var v2) && v2.ValueKind == JsonValueKind.String && double.TryParse(v2.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var s) ? s : null;
}
