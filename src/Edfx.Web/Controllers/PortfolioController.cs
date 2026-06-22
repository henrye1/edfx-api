using Edfx.Storage;
using Microsoft.AspNetCore.Mvc;

namespace Edfx.Web.Controllers;

[ApiController]
[Route("api/portfolios")]
public class PortfolioController : ControllerBase
{
    private readonly PortfolioRepository _repo;
    private readonly ILogger<PortfolioController> _log;
    public PortfolioController(PortfolioRepository repo, ILogger<PortfolioController> log) { _repo = repo; _log = log; }

    public record AddCompanyRequest
    {
        public string EntityId { get; init; } = "";
        public string? Name { get; init; }
        public string? Industry { get; init; }
        public double? Pd { get; init; }
        public string? ImpliedRating { get; init; }
        public string? Ews { get; init; }
        public string? EwsChange { get; init; }
        public double? PeerPercentile { get; init; }
    }

    /// <summary>Persisted companies for a portfolio. Returns [] if the store is unavailable.</summary>
    [HttpGet("{id}/companies")]
    public ActionResult<List<PortfolioCompany>> List(string id)
    {
        try { return _repo.Companies(id); }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Portfolio company list failed for {PortfolioId}", id);
            return new List<PortfolioCompany>();
        }
    }

    /// <summary>Persists a company (with its loaded data snapshot) into a portfolio.</summary>
    [HttpPost("{id}/companies")]
    public ActionResult AddCompany(string id, [FromBody] AddCompanyRequest req)
    {
        if (string.IsNullOrWhiteSpace(req?.EntityId)) return BadRequest(new { error = "entityId is required" });
        try
        {
            _repo.AddCompany(id, new PortfolioCompany(
                req.EntityId, req.Name, req.Industry, req.Pd, req.ImpliedRating,
                req.Ews, req.EwsChange, req.PeerPercentile, default));
            return Ok(new { persisted = true });
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Portfolio persist failed for {PortfolioId}/{EntityId}", id, req.EntityId);
            return StatusCode(503, new { persisted = false, error = "Persistence unavailable (database not configured or unreachable)." });
        }
    }
}
