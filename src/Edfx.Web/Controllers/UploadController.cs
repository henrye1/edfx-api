using Edfx.ApiClient;
using Edfx.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace Edfx.Web.Controllers;

[ApiController]
[Route("api/uploads")]
public class UploadController : ControllerBase
{
    private readonly UploadScoreService _svc;
    private readonly IEdfxClient _client;
    public UploadController(UploadScoreService svc, IEdfxClient client) { _svc = svc; _client = client; }

    /// <summary>Downloads the EDF-X input template (universal or bank) as CSV.</summary>
    [HttpGet("template")]
    public async Task<IActionResult> Template([FromQuery] string kind = "universal")
    {
        var bytes = await _client.DownloadTemplateAsync(kind == "bank" ? "bank" : "universal");
        return File(bytes, "text/csv", $"edfx_{(kind == "bank" ? "bank" : "universal")}_template.csv");
    }

    /// <summary>Scores an uploaded financials file (CSV or Excel) and returns PIT + TTC PDs, drivers and ratios.</summary>
    [HttpPost("score")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<UploadScoreResult>> Score(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "No file uploaded." });
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        return await _svc.ScoreAsync(ms.ToArray(), file.FileName, ct);
    }
}
