using Edfx.ApiClient;

namespace Edfx.Web.Services;

public record ExtractResult(string Section, int Version, int HttpStatus, string Status, string Raw);

public class ExtractionService
{
    private readonly IEdfxClient _client;
    private readonly IExtractionSaver _saver;

    public ExtractionService(IEdfxClient client, IExtractionSaver saver)
    {
        _client = client;
        _saver = saver;
    }

    public async Task<ExtractResult> ExtractAndSaveAsync(string entityId, string section,
        string? startDate = null, string? endDate = null, string? frequency = null)
    {
        var (raw, status) = await _client.ExtractAsync(section, new[] { entityId }, startDate, endDate, frequency);
        var ok = status is >= 200 and < 300 ? "ok" : "error";
        var version = _saver.Save(entityId, section, raw, status, ok);
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
