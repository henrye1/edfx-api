using Edfx.ApiClient;
using Edfx.Domain;
using Microsoft.AspNetCore.Mvc;

namespace Edfx.Web.Controllers;

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
}
