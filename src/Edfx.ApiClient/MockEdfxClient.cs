using Edfx.Domain; using System.Text.Json;
namespace Edfx.ApiClient;
public class MockEdfxClient : IEdfxClient
{
    private static readonly JsonSerializerOptions J = new() { PropertyNameCaseInsensitive = true };
    public Task<(EntitySearchResponse, string)> SearchAsync(string q, int limit = 20, int offset = 0)
    {
        var raw = SampleData.Search;
        return Task.FromResult((JsonSerializer.Deserialize<EntitySearchResponse>(raw, J)!, raw));
    }
    public Task<(string raw, int status)> PostRawAsync(string path, object body)
        => Task.FromResult((SampleData.ForPath(path), 200));
    public Task<(string raw, int status)> ExtractAsync(string section, IEnumerable<string> ids,
        string? s = null, string? e = null, string? f = null)
        => Task.FromResult((SampleData.ForSection(section), 200));
}
