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

    public record CreatePortfolioRequest
    {
        public string Name { get; init; } = "";
        public string? CreatedBy { get; init; }
    }

    /// <summary>Lists persisted portfolios (with company counts / EWS distribution / median PD).</summary>
    [HttpGet]
    public ActionResult<List<PortfolioSummaryRow>> List()
    {
        try { return _repo.ListPortfolios(); }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Portfolio list failed");
            return new List<PortfolioSummaryRow>();
        }
    }

    /// <summary>Creates a new portfolio. Returns its generated id + name.</summary>
    [HttpPost]
    public ActionResult Create([FromBody] CreatePortfolioRequest req)
    {
        var name = req?.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return BadRequest(new { error = "name is required" });
        var id = Slug(name) + "-" + Guid.NewGuid().ToString("N")[..6];
        try
        {
            _repo.CreatePortfolio(id, name, req!.CreatedBy);
            return Ok(new { portfolioId = id, name, persisted = true });
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Portfolio create failed");
            // Still return the id so the UI can use it in-session; flag it as not persisted.
            return StatusCode(503, new { portfolioId = id, name, persisted = false, error = "Persistence unavailable (database not configured or unreachable)." });
        }
    }

    /// <summary>Portfolio name lookup (for the detail header of created portfolios).</summary>
    [HttpGet("{id}")]
    public ActionResult Meta(string id)
    {
        try
        {
            var name = _repo.GetPortfolioName(id);
            return name is null ? NotFound() : Ok(new { portfolioId = id, name });
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Portfolio meta failed for {PortfolioId}", id);
            return NotFound();
        }
    }

    private static string Slug(string name)
    {
        var chars = name.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray();
        var slug = new string(chars).Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return string.IsNullOrEmpty(slug) ? "portfolio" : slug;
    }

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

    /// <summary>Deletes a portfolio and its companies.</summary>
    [HttpDelete("{id}")]
    public ActionResult Delete(string id)
    {
        try { _repo.DeletePortfolio(id); return Ok(new { deleted = true }); }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Portfolio delete failed for {PortfolioId}", id);
            return StatusCode(503, new { deleted = false, error = "Persistence unavailable." });
        }
    }

    /// <summary>Removes a single company from a portfolio.</summary>
    [HttpDelete("{id}/companies/{entityId}")]
    public ActionResult RemoveCompany(string id, string entityId)
    {
        try { _repo.RemoveCompany(id, entityId); return Ok(new { removed = true }); }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Remove company failed for {PortfolioId}/{EntityId}", id, entityId);
            return StatusCode(503, new { removed = false, error = "Persistence unavailable." });
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
