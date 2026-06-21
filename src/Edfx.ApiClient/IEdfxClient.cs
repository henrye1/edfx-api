using Edfx.Domain;
namespace Edfx.ApiClient;
public interface IEdfxClient
{
    Task<(EntitySearchResponse, string)> SearchAsync(string query, int limit = 20, int offset = 0);
    Task<(string raw, int status)> PostRawAsync(string path, object body);
    Task<(string raw, int status)> ExtractAsync(string section, IEnumerable<string> entityIds,
        string? startDate = null, string? endDate = null, string? historyFrequency = null);
}
