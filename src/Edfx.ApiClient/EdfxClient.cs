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
        using (var resp = await Send())
        {
            if (resp.StatusCode != HttpStatusCode.Unauthorized)
                return (await resp.Content.ReadAsStringAsync(), (int)resp.StatusCode);
        }
        await _tokens.GetTokenAsync(force: true);
        using var retry = await Send();
        return (await retry.Content.ReadAsStringAsync(), (int)retry.StatusCode);
    }

    public async Task<(EntitySearchResponse, string)> SearchAsync(string query, int limit = 20, int offset = 0)
    {
        var (raw, _) = await PostRawAsync("entity/v1/search", new { query, limit, offset });
        return (JsonSerializer.Deserialize<EntitySearchResponse>(raw, J)!, raw);
    }

    public Task<(string raw, int status)> ExtractAsync(string section, IEnumerable<string> entityIds,
        string? startDate = null, string? endDate = null, string? historyFrequency = null)
    {
        var ents = entityIds.Select(id => new { entityId = id }).ToArray();
        object body = new { entities = ents, startDate, endDate, historyFrequency };
        var path = section switch
        {
            "pds"               => "entities/pds",
            "pds_creditedge"    => "entities/pds/creditedge",
            "pds_riskcalc"      => "entities/pds/riskcalc",
            "pds_payment"       => "entities/pds/payment",
            "statements"        => "entities/financials/statements",
            "ratios"            => "entities/financials/ratios",
            "ratios_calculate"  => "entities/financials/ratios/calculate",
            "peers_id"          => "entities/peers/id",
            "peers_metrics"     => "entities/peers/metrics",
            "peers_percentile"  => "entities/peers/percentile",
            "peers_metadata"    => "entities/peers/metadata",
            "peers_recommended" => "entities/peers/recommended",
            "risk_category"     => "tools/riskCategory",
            "triggers"          => "tools/triggers",
            "credit_limit"      => "tools/creditLimit",
            _ => throw new ArgumentException($"Unknown section '{section}'")
        };
        return PostRawAsync(path, body);
    }

    public static readonly string[] AllSections =
    {
        "pds", "pds_creditedge", "pds_riskcalc", "pds_payment", "statements", "ratios",
        "ratios_calculate", "peers_id", "peers_metrics", "peers_percentile", "peers_metadata",
        "peers_recommended", "risk_category", "triggers", "credit_limit"
    };
}
