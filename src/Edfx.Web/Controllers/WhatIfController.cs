using Edfx.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace Edfx.Web.Controllers;

[ApiController]
[Route("api/entities")]
public class WhatIfController : ControllerBase
{
    private readonly WhatIfService _svc;
    public WhatIfController(WhatIfService svc) { _svc = svc; }

    public record WhatIfRequest
    {
        // Map of template column name -> overridden value (e.g. { "netSales": 200000 }).
        public Dictionary<string, double> Overrides { get; init; } = new();
    }

    /// <summary>
    /// Recomputes the entity's PD from its real financials with the supplied
    /// overrides applied (EDF-X modelInputs upload flow).
    /// </summary>
    [HttpPost("{id}/whatif")]
    public async Task<ActionResult<WhatIfResult>> WhatIf(string id, [FromBody] WhatIfRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id)) return BadRequest();
        return await _svc.ComputeAsync(id, req.Overrides ?? new(), ct);
    }
}
