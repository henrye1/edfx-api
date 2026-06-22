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

    /// <summary>
    /// Downloads the EDF-X corporate input template. Default is an annotated Excel
    /// (mandatory fields highlighted + an example row + a Field Guide); ?format=csv
    /// returns the raw CSV template.
    /// </summary>
    [HttpGet("template")]
    public async Task<IActionResult> Template([FromQuery] string format = "xlsx")
    {
        var csv = System.Text.Encoding.UTF8.GetString(await _client.DownloadTemplateAsync("universal"));
        if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "edfx_corporate_template.csv");

        var cols = csv.Replace("\r", "").Split('\n')[0].Split(',');
        return File(TemplateBuilder.AnnotatedXlsx(cols),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "edfx_corporate_template.xlsx");
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
