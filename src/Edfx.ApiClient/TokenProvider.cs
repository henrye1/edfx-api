using System.Text.Json;
namespace Edfx.ApiClient;

public class TokenProvider
{
    private readonly HttpClient _http;
    private readonly EdfxOptions _o;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private string? _token;
    private DateTimeOffset _expiry = DateTimeOffset.MinValue;

    public TokenProvider(HttpClient http, EdfxOptions o) { _http = http; _o = o; }

    public async Task<string> GetTokenAsync(bool force = false)
    {
        if (!force && _token is not null && DateTimeOffset.UtcNow < _expiry) return _token;
        await _gate.WaitAsync();
        try
        {
            if (!force && _token is not null && DateTimeOffset.UtcNow < _expiry) return _token;
            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["username"] = _o.Username, ["password"] = _o.Password,
                ["grant_type"] = "password", ["scope"] = "openid"
            });
            using var resp = await _http.PostAsync(_o.TokenUrl, form);
            resp.EnsureSuccessStatusCode();
            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            _token = doc.RootElement.GetProperty("id_token").GetString();
            _expiry = DateTimeOffset.UtcNow.AddMinutes(50);
            return _token!;
        }
        finally { _gate.Release(); }
    }
}
