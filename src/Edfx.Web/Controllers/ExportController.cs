using Edfx.Storage;
using Edfx.Web.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Edfx.Web.Controllers;

[ApiController]
[Route("export")]
public class ExportController : ControllerBase
{
    private readonly ExtractionRepository _repo;

    public ExportController(ExtractionRepository repo) { _repo = repo; }

    [HttpGet("{entityId}/{section}.{fmt}")]
    public IActionResult Download(string entityId, string section, string fmt)
    {
        var raw = _repo.LatestRaw(entityId, section);
        if (raw is null) return NotFound();
        var rows = Flatten(raw);
        return fmt == "csv"
            ? File(Exporter.ToCsv(rows), "text/csv", $"{entityId}_{section}.csv")
            : File(Exporter.ToXlsx((section, rows)), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{entityId}_{section}.xlsx");
    }

    private static List<Dictionary<string, object?>> Flatten(string raw)
    {
        using var doc = JsonDocument.Parse(raw);
        var rows = new List<Dictionary<string, object?>>();
        void AddObj(JsonElement o)
        {
            var d = new Dictionary<string, object?>();
            foreach (var p in o.EnumerateObject())
                if (p.Value.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array))
                    d[p.Name] = p.Value.ToString();
            if (d.Count > 0) rows.Add(d);
        }
        var root = doc.RootElement;
        if (root.TryGetProperty("entities", out var ents) && ents.ValueKind == JsonValueKind.Array)
            foreach (var e in ents.EnumerateArray()) AddObj(e);
        else AddObj(root);
        return rows;
    }
}
