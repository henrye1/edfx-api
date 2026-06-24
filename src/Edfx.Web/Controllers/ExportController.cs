using Edfx.Storage;
using Edfx.Web.Services;
using Microsoft.AspNetCore.Mvc;

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
        var rows = JsonFlattener.Flatten(raw);
        return fmt == "csv"
            ? File(Exporter.ToCsv(rows), "text/csv", $"{entityId}_{section}.csv")
            : File(Exporter.ToXlsx((section, rows)), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{entityId}_{section}.xlsx");
    }
}
