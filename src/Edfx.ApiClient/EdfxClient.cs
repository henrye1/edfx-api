using System.Net; using System.Text; using System.Text.Json;
using Edfx.Domain;
namespace Edfx.ApiClient;

public class EdfxClient : IEdfxClient
{
    private static readonly JsonSerializerOptions J = new() { PropertyNameCaseInsensitive = true };
    private readonly HttpClient _http; private readonly TokenProvider _tokens; private readonly EdfxOptions _o;
    public EdfxClient(HttpClient http, TokenProvider tokens, EdfxOptions o)
    { _http = http; _tokens = tokens; _o = o; if (_http.BaseAddress is null) _http.BaseAddress = new Uri(_o.BaseUrl); }

    public async Task<(string raw, int status)> PostRawAsync(string path, object body)
    {
        var json = JsonSerializer.Serialize(body);
        async Task<HttpResponseMessage> Send()
        {
            var req = new HttpRequestMessage(HttpMethod.Post, path)
                { Content = new StringContent(json, Encoding.UTF8, "application/json") };
            req.Headers.Add("Authorization", $"Bearer {await _tokens.GetTokenAsync()}");
            return await _http.SendAsync(req);
        }
        var resp = await Send();
        if (resp.StatusCode == HttpStatusCode.Unauthorized)
        { await _tokens.GetTokenAsync(force: true); resp = await Send(); }
        return (await resp.Content.ReadAsStringAsync(), (int)resp.StatusCode);
    }

    public async Task<(EntitySearchResponse, string)> SearchAsync(string query, int limit = 20, int offset = 0)
    {
        var (raw, _) = await PostRawAsync("entity/v1/search", new { query, limit, offset });
        return (JsonSerializer.Deserialize<EntitySearchResponse>(raw, J)!, raw);
    }
}
