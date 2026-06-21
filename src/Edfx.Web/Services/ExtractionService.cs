using Edfx.ApiClient;
using Microsoft.Extensions.Logging;

namespace Edfx.Web.Services;

public record ExtractResult(string Section, int Version, int HttpStatus, string Status, string Raw);

public class ExtractionService
{
    private readonly IEdfxClient _client;
    private readonly IExtractionSaver _saver;
    private readonly ILogger<ExtractionService> _logger;

    public ExtractionService(IEdfxClient client, IExtractionSaver saver, ILogger<ExtractionService> logger)
    {
        _client = client;
        _saver = saver;
        _logger = logger;
    }

    public async Task<ExtractResult> ExtractAndSaveAsync(string entityId, string section,
        string? startDate = null, string? endDate = null, string? frequency = null)
    {
        var (raw, status) = await _client.ExtractAsync(section, new[] { entityId }, startDate, endDate, frequency);
        var ok = status is >= 200 and < 300 ? "ok" : "error";
        // Fix 3: build real request_params JSON for full audit lineage
        var requestParams = System.Text.Json.JsonSerializer.Serialize(new { section, entityId, startDate, endDate, frequency });
        int version;
        try
        {
            version = _saver.Save(entityId, section, raw, status, ok, requestParams);
        }
        catch (Exception ex)
        {
            // Fix 4: structured logging on save failure
            _logger.LogError(ex, "Failed to persist {Section} for {EntityId}", section, entityId);
            throw;
        }
        // Fix 4: structured logging of extraction outcome
        _logger.LogInformation("Extracted {Section} for {EntityId}: HTTP {Status} v{Version}", section, entityId, status, version);
        return new ExtractResult(section, version, status, ok, raw);
    }

    public async Task<List<ExtractResult>> ExtractAllAsync(string entityId,
        IEnumerable<string> sections, Action<string>? onProgress = null)
    {
        var results = new List<ExtractResult>();
        foreach (var s in sections)
        {
            onProgress?.Invoke(s);
            results.Add(await ExtractAndSaveAsync(entityId, s));
        }
        return results;
    }
}
