# EDFX Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A C# Blazor Server web app that searches the Moody's EDF-X API, extracts every available data section for an entity, persists each pull as an immutable versioned record in Supabase/Postgres, and exports to Excel/CSV.

**Architecture:** Layered .NET 8 solution. `Edfx.ApiClient` owns OAuth + one typed method per EDF-X endpoint. `Edfx.Domain` holds response records. `Edfx.Storage` does versioned inserts into Supabase via Npgsql. `Edfx.Web` is the Blazor Server UI. Browser never sees secrets; the server proxies all EDF-X calls and writes to Postgres.

**Tech Stack:** .NET 8, Blazor Server, Npgsql (direct Postgres to Supabase), Polly (resilience), ClosedXML (Excel), CsvHelper (CSV), xUnit + NSubstitute + WireMock.Net (tests), Docker + GitHub Actions.

---

## Conventions

- **TDD:** every code task is test-first. Run `dotnet test` from the solution root.
- **Sections** are the canonical extraction keys (used in DB + UI): `search`, `pds`, `pds_creditedge`, `pds_riskcalc`, `pds_payment`, `statements`, `ratios`, `ratios_calculate`, `peers_id`, `peers_metrics`, `peers_percentile`, `peers_metadata`, `peers_recommended`, `risk_category`, `triggers`, `credit_limit`, `model_inputs`, `payment_upload`.
- **Secrets** only from env vars / user-secrets: `EDFX_USERNAME`, `EDFX_PASSWORD`, `EDFX_BASE_URL` (default `https://api.edfx.moodysanalytics.com/edfx/v1/`), `EDFX_TOKEN_URL` (default `https://sso.moodysanalytics.com/sso-api/v1/token`), `SUPABASE_DB_CONNECTION` (Npgsql connection string from Supabase → Settings → Database).
- **Defaults chosen** (were left open in spec): hosting = a Dockerized container (host-agnostic; Render free tier is the documented default in Task 24). Section build order = PD → financials/ratios → peers → early warning → credit limits. Mock/sandbox mode = kept (Task 6).
- Commit after every task with the message shown.

---

## File Structure

```
edfx-api/
├─ Edfx.sln
├─ Dockerfile
├─ .github/workflows/ci.yml
├─ .gitignore
├─ README.md
├─ migrations/
│   ├─ 001_core.sql            # entities, extractions
│   └─ 002_projections.sql     # pd_values, financial_ratios, peer_metrics, early_warning, credit_limits
├─ src/
│   ├─ Edfx.Domain/            # records: search, pd, financials, peers, tools
│   ├─ Edfx.ApiClient/         # EdfxOptions, TokenProvider, EdfxClient, IEdfxClient, MockEdfxClient
│   ├─ Edfx.Storage/           # Db, ExtractionRepository, projections
│   └─ Edfx.Web/               # Blazor Server: Pages, Components, Services (ExtractionService, Exporter)
└─ tests/
    ├─ Edfx.ApiClient.Tests/
    ├─ Edfx.Storage.Tests/
    └─ Edfx.Web.Tests/
```

---

## Phase 0 — Scaffold & CI

### Task 1: Create solution and projects

**Files:** create `Edfx.sln`, `src/*/*.csproj`, `tests/*/*.csproj`, `.gitignore`.

- [ ] **Step 1: Scaffold**

```bash
cd edfx-api
dotnet new sln -n Edfx
dotnet new classlib -n Edfx.Domain    -o src/Edfx.Domain    -f net8.0
dotnet new classlib -n Edfx.ApiClient -o src/Edfx.ApiClient -f net8.0
dotnet new classlib -n Edfx.Storage   -o src/Edfx.Storage   -f net8.0
dotnet new blazorserver -n Edfx.Web   -o src/Edfx.Web       -f net8.0
dotnet new xunit -n Edfx.ApiClient.Tests -o tests/Edfx.ApiClient.Tests -f net8.0
dotnet new xunit -n Edfx.Storage.Tests   -o tests/Edfx.Storage.Tests   -f net8.0
dotnet new xunit -n Edfx.Web.Tests       -o tests/Edfx.Web.Tests       -f net8.0
dotnet sln add (Get-ChildItem -Recurse *.csproj)   # PowerShell; bash: dotnet sln add $(find . -name *.csproj)
# references
dotnet add src/Edfx.ApiClient reference src/Edfx.Domain
dotnet add src/Edfx.Storage   reference src/Edfx.Domain
dotnet add src/Edfx.Web       reference src/Edfx.ApiClient src/Edfx.Storage src/Edfx.Domain
dotnet add tests/Edfx.ApiClient.Tests reference src/Edfx.ApiClient src/Edfx.Domain
dotnet add tests/Edfx.Storage.Tests   reference src/Edfx.Storage src/Edfx.Domain
dotnet add tests/Edfx.Web.Tests       reference src/Edfx.Web
# packages
dotnet add src/Edfx.ApiClient package Microsoft.Extensions.Http.Polly
dotnet add src/Edfx.ApiClient package Polly
dotnet add src/Edfx.Storage   package Npgsql
dotnet add src/Edfx.Web       package ClosedXML
dotnet add src/Edfx.Web       package CsvHelper
dotnet add tests/Edfx.ApiClient.Tests package WireMock.Net
dotnet add tests/Edfx.ApiClient.Tests package NSubstitute
dotnet add tests/Edfx.Storage.Tests   package Npgsql
dotnet add tests/Edfx.Web.Tests       package NSubstitute
```

- [ ] **Step 2: Add `.gitignore`** (create `.gitignore`)

```gitignore
bin/
obj/
*.user
.vs/
appsettings.*.local.json
.env
```

- [ ] **Step 3: Build**

Run: `dotnet build`
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Edfx solution (.NET 8 Blazor Server, layered)"
```

### Task 2: CI workflow

**Files:** create `.github/workflows/ci.yml`.

- [ ] **Step 1: Write workflow**

```yaml
name: CI
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - run: dotnet restore
      - run: dotnet build --no-restore -c Release
      - run: dotnet test --no-build -c Release --verbosity normal
```

- [ ] **Step 2: Commit**

```bash
git add .github && git commit -m "ci: build and test on push/PR"
```

---

## Phase 1 — Domain models

### Task 3: Search response records

**Files:** Create `src/Edfx.Domain/Search.cs`; Test `tests/Edfx.ApiClient.Tests/SearchDeserializeTests.cs`.

- [ ] **Step 1: Write failing test** (deserialize the User-Guide sample)

```csharp
using System.Text.Json;
using Edfx.Domain;
using Xunit;

public class SearchDeserializeTests
{
    [Fact]
    public void Deserializes_entity_search_response()
    {
        const string json = """
        { "entities": [ {
            "entityId":"US942404110","pid":"037833","identifierBvd":"US942404110",
            "internationalName":"APPLE, INC.","countryName":"United States of America",
            "primaryIndustryNDYDescription":"ELECTRONIC EQUIPMENT","ticker":"AAPL",
            "hasFinancials":"Yes" } ], "total": 10000 }
        """;
        var r = JsonSerializer.Deserialize<EntitySearchResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.Equal(10000, r!.Total);
        Assert.Equal("APPLE, INC.", r.Entities[0].InternationalName);
        Assert.Equal("AAPL", r.Entities[0].Ticker);
    }
}
```

- [ ] **Step 2: Run, expect fail** — Run: `dotnet test tests/Edfx.ApiClient.Tests` → FAIL (type `EntitySearchResponse` not found).

- [ ] **Step 3: Implement records**

```csharp
namespace Edfx.Domain;

public record EntitySearchResponse
{
    public List<EntitySummary> Entities { get; init; } = new();
    public int Total { get; init; }
}

public record EntitySummary
{
    public string EntityId { get; init; } = "";
    public string? Pid { get; init; }
    public string? IdentifierBvd { get; init; }
    public string? IdentifierOrbis { get; init; }
    public string? InternationalName { get; init; }
    public string? CountryName { get; init; }
    public string? ContactCity { get; init; }
    public string? PrimaryIndustryNDYDescription { get; init; }
    public string? Ticker { get; init; }
    public string? HasFinancials { get; init; }
    public string? PeerGroupId1 { get; init; }
    public string? PeerGroupId2 { get; init; }
}
```

- [ ] **Step 4: Run, expect pass** — Run: `dotnet test tests/Edfx.ApiClient.Tests` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(domain): entity search records"`

### Task 4: PD, financials, peers, tools records

**Files:** Create `src/Edfx.Domain/Pd.cs`, `Financials.cs`, `Peers.cs`, `Tools.cs`; Test `tests/Edfx.ApiClient.Tests/PdDeserializeTests.cs`.

- [ ] **Step 1: Write failing test**

```csharp
using System.Text.Json;
using Edfx.Domain;
using Xunit;

public class PdDeserializeTests
{
    [Fact]
    public void Deserializes_pd_detail()
    {
        const string json = """
        { "entities":[ { "entityId":"AT9110116332","asOfDate":"2018-03-01",
          "pd":0.00289,"impliedRating":"Aa1","confidence":"PF-G-S" } ] }
        """;
        var r = JsonSerializer.Deserialize<PdResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.Equal(0.00289, r!.Entities[0].Pd);
        Assert.Equal("Aa1", r.Entities[0].ImpliedRating);
    }
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement records** (raw-JSON-friendly; unmodeled fields tolerated by case-insensitive options)

```csharp
// Pd.cs
namespace Edfx.Domain;
public record PdResponse { public List<PdEntity> Entities { get; init; } = new(); }
public record PdEntity
{
    public string EntityId { get; init; } = "";
    public string? AsOfDate { get; init; }
    public double? Pd { get; init; }
    public string? ImpliedRating { get; init; }
    public string? Confidence { get; init; }
    public List<PdHistoryPoint>? History { get; init; }
}
public record PdHistoryPoint { public string? Date { get; init; } public double? Pd { get; init; } public string? ImpliedRating { get; init; } }
```

```csharp
// Financials.cs
namespace Edfx.Domain;
public record StatementsResponse { public List<StatementEntity> Entities { get; init; } = new(); }
public record StatementEntity { public string EntityId { get; init; } = ""; public List<StatementLine> Statements { get; init; } = new(); }
public record StatementLine { public string? Item { get; init; } public string? Period { get; init; } public double? Value { get; init; } public string? Currency { get; init; } }

public record RatiosResponse { public List<RatioEntity> Entities { get; init; } = new(); }
public record RatioEntity { public string EntityId { get; init; } = ""; public List<RatioLine> Ratios { get; init; } = new(); }
public record RatioLine { public string? Name { get; init; } public string? Period { get; init; } public double? Value { get; init; } }
```

```csharp
// Peers.cs
namespace Edfx.Domain;
public record PeerMetricsResponse { public List<PeerMetric> Metrics { get; init; } = new(); }
public record PeerMetric { public string? Metric { get; init; } public double? EntityValue { get; init; } public double? Percentile { get; init; } public double? Median { get; init; } }
public record PeerMetadataResponse { public string? PeerGroupId { get; init; } public string? Name { get; init; } public int? Size { get; init; } }
```

```csharp
// Tools.cs
namespace Edfx.Domain;
public record RiskCategoryResponse { public List<RiskCategoryEntity> Entities { get; init; } = new(); }
public record RiskCategoryEntity { public string EntityId { get; init; } = ""; public string? RiskCategory { get; init; } public string? AsOfDate { get; init; } }
public record TriggersResponse { public List<TriggerEntity> Entities { get; init; } = new(); }
public record TriggerEntity { public string EntityId { get; init; } = ""; public List<TriggerLine> Triggers { get; init; } = new(); }
public record TriggerLine { public string? Name { get; init; } public string? Severity { get; init; } public bool? Triggered { get; init; } }
public record CreditLimitResponse { public List<CreditLimitEntity> Entities { get; init; } = new(); }
public record CreditLimitEntity { public string EntityId { get; init; } = ""; public double? LimitAmount { get; init; } public string? Currency { get; init; } public string? Horizon { get; init; } }
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(domain): PD, financials, peers, tools records"`

> **Note for implementer:** these records intentionally model the high-value fields. The full raw JSON is always persisted (Phase 3), so additional fields from the User-Guide "Appendix: Output Details" can be projected later without data loss. When wiring each endpoint, open the PDF appendix (pp. 71–80) to confirm field names for that section.

---

## Phase 2 — EDF-X API client

### Task 5: Options + OAuth token provider

**Files:** Create `src/Edfx.ApiClient/EdfxOptions.cs`, `TokenProvider.cs`; Test `tests/Edfx.ApiClient.Tests/TokenProviderTests.cs`.

- [ ] **Step 1: Write failing test** (token fetched once, cached, refreshed after expiry) using WireMock

```csharp
using Edfx.ApiClient;
using WireMock.Server; using WireMock.RequestBuilders; using WireMock.ResponseBuilders;
using Xunit;

public class TokenProviderTests
{
    [Fact]
    public async Task Fetches_and_caches_bearer_token()
    {
        var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .RespondWith(Response.Create().WithStatusCode(200)
                  .WithBody("""{"id_token":"ID123","token_type":"Bearer"}"""));
        var opts = new EdfxOptions { Username="u", Password="p",
            TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/" };
        var http = new HttpClient();
        var sut = new TokenProvider(http, opts);

        Assert.Equal("ID123", await sut.GetTokenAsync());
        Assert.Equal("ID123", await sut.GetTokenAsync());          // cached
        Assert.Single(server.LogEntries);                          // only one POST
    }
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```csharp
// EdfxOptions.cs
namespace Edfx.ApiClient;
public class EdfxOptions
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string BaseUrl { get; set; } = "https://api.edfx.moodysanalytics.com/edfx/v1/";
    public string TokenUrl { get; set; } = "https://sso.moodysanalytics.com/sso-api/v1/token";
    public bool UseMock { get; set; }
}
```

```csharp
// TokenProvider.cs
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
            _expiry = DateTimeOffset.UtcNow.AddMinutes(50);   // tokens ~1h; refresh early
            return _token!;
        }
        finally { _gate.Release(); }
    }
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(client): OAuth token provider with caching"`

### Task 6: IEdfxClient interface + raw-call core + 401 refresh

**Files:** Create `src/Edfx.ApiClient/IEdfxClient.cs`, `EdfxClient.cs`; Test `tests/Edfx.ApiClient.Tests/EdfxClientTests.cs`.

- [ ] **Step 1: Write failing test** (POST adds bearer header; retries once on 401 after refreshing token; returns raw JSON + typed)

```csharp
using Edfx.ApiClient; using Edfx.Domain;
using WireMock.Server; using WireMock.RequestBuilders; using WireMock.ResponseBuilders;
using Xunit;

public class EdfxClientTests
{
    [Fact]
    public async Task Search_posts_with_bearer_and_returns_typed_and_raw()
    {
        var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .RespondWith(Response.Create().WithBody("""{"id_token":"T1","token_type":"Bearer"}"""));
        server.Given(Request.Create().WithPath("/entity/v1/search").UsingPost()
                 .WithHeader("Authorization", "Bearer T1"))
              .RespondWith(Response.Create().WithStatusCode(200)
                 .WithBody("""{"entities":[{"entityId":"X","internationalName":"ACME"}],"total":1}"""));
        var opts = new EdfxOptions { Username="u", Password="p",
            TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/" };
        var http = new HttpClient { BaseAddress = new Uri(server.Url + "/") };
        var sut = new EdfxClient(http, new TokenProvider(new HttpClient(), opts), opts);

        var (typed, raw) = await sut.SearchAsync("ACME");
        Assert.Equal("ACME", typed.Entities[0].InternationalName);
        Assert.Contains("\"total\":1", raw);
    }
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement interface + client core**

```csharp
// IEdfxClient.cs
using Edfx.Domain;
namespace Edfx.ApiClient;
public interface IEdfxClient
{
    Task<(EntitySearchResponse, string)> SearchAsync(string query, int limit = 20, int offset = 0);
    Task<(string raw, int status)> PostRawAsync(string path, object body);
}
```

```csharp
// EdfxClient.cs
using System.Net; using System.Net.Http.Json; using System.Text; using System.Text.Json;
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
        if (resp.StatusCode == HttpStatusCode.Unauthorized)        // refresh once and retry
        { await _tokens.GetTokenAsync(force: true); resp = await Send(); }
        return (await resp.Content.ReadAsStringAsync(), (int)resp.StatusCode);
    }

    public async Task<(EntitySearchResponse, string)> SearchAsync(string query, int limit = 20, int offset = 0)
    {
        var (raw, _) = await PostRawAsync("entity/v1/search", new { query, limit, offset });
        return (JsonSerializer.Deserialize<EntitySearchResponse>(raw, J)!, raw);
    }
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(client): raw POST core with 401 refresh + typed search"`

### Task 7: Typed endpoint methods for every section

**Files:** Modify `src/Edfx.ApiClient/IEdfxClient.cs`, `EdfxClient.cs`; Test `tests/Edfx.ApiClient.Tests/EndpointPathTests.cs`.

Each method calls `PostRawAsync` with the right path/body and deserializes. The test asserts the path each method hits.

- [ ] **Step 1: Write failing test** (parameterized over every endpoint)

```csharp
using Edfx.ApiClient;
using WireMock.Server; using WireMock.RequestBuilders; using WireMock.ResponseBuilders;
using Xunit;

public class EndpointPathTests
{
    private static (EdfxClient, WireMockServer) Make()
    {
        var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .RespondWith(Response.Create().WithBody("""{"id_token":"T","token_type":"Bearer"}"""));
        server.Given(Request.Create().UsingPost())
              .RespondWith(Response.Create().WithStatusCode(200).WithBody("{}"));
        var opts = new EdfxOptions { TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/" };
        var http = new HttpClient { BaseAddress = new Uri(server.Url + "/") };
        return (new EdfxClient(http, new TokenProvider(new HttpClient(), opts), opts), server);
    }

    [Theory]
    [InlineData("pds", "/entities/pds")]
    [InlineData("pds_creditedge", "/entities/pds/creditedge")]
    [InlineData("pds_riskcalc", "/entities/pds/riskcalc")]
    [InlineData("pds_payment", "/entities/pds/payment")]
    [InlineData("statements", "/entities/financials/statements")]
    [InlineData("ratios", "/entities/financials/ratios")]
    [InlineData("ratios_calculate", "/entities/financials/ratios/calculate")]
    [InlineData("peers_id", "/entities/peers/id")]
    [InlineData("peers_metrics", "/entities/peers/metrics")]
    [InlineData("peers_percentile", "/entities/peers/percentile")]
    [InlineData("peers_metadata", "/entities/peers/metadata")]
    [InlineData("peers_recommended", "/entities/peers/recommended")]
    [InlineData("risk_category", "/tools/riskCategory")]
    [InlineData("triggers", "/tools/triggers")]
    [InlineData("credit_limit", "/tools/creditLimit")]
    public async Task Section_hits_expected_path(string section, string path)
    {
        var (sut, server) = Make();
        await sut.ExtractAsync(section, new[] { "AT9110116332" });
        Assert.Contains(server.LogEntries, e => e.RequestMessage.Path == path);
    }
}
```

- [ ] **Step 2: Run, expect fail** (`ExtractAsync` not defined).

- [ ] **Step 3: Implement a single section dispatcher** (keeps one place mapping section→path/body)

```csharp
// add to IEdfxClient.cs
Task<(string raw, int status)> ExtractAsync(string section, IEnumerable<string> entityIds,
    string? startDate = null, string? endDate = null, string? historyFrequency = null);
```

```csharp
// add to EdfxClient.cs
public Task<(string raw, int status)> ExtractAsync(string section, IEnumerable<string> entityIds,
    string? startDate = null, string? endDate = null, string? historyFrequency = null)
{
    var ents = entityIds.Select(id => new { entityId = id }).ToArray();
    object body = new { entities = ents, startDate, endDate, historyFrequency };
    var path = section switch
    {
        "pds"              => "entities/pds",
        "pds_creditedge"   => "entities/pds/creditedge",
        "pds_riskcalc"     => "entities/pds/riskcalc",
        "pds_payment"      => "entities/pds/payment",
        "statements"       => "entities/financials/statements",
        "ratios"           => "entities/financials/ratios",
        "ratios_calculate" => "entities/financials/ratios/calculate",
        "peers_id"         => "entities/peers/id",
        "peers_metrics"    => "entities/peers/metrics",
        "peers_percentile" => "entities/peers/percentile",
        "peers_metadata"   => "entities/peers/metadata",
        "peers_recommended"=> "entities/peers/recommended",
        "risk_category"    => "tools/riskCategory",
        "triggers"         => "tools/triggers",
        "credit_limit"     => "tools/creditLimit",
        _ => throw new ArgumentException($"Unknown section '{section}'")
    };
    return PostRawAsync(path, body);
}

public static readonly string[] AllSections =
{
    "pds","pds_creditedge","pds_riskcalc","pds_payment","statements","ratios",
    "ratios_calculate","peers_id","peers_metrics","peers_percentile","peers_metadata",
    "peers_recommended","risk_category","triggers","credit_limit"
};
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(client): section dispatcher for all extraction endpoints"`

### Task 8: Mock client (sandbox mode)

**Files:** Create `src/Edfx.ApiClient/MockEdfxClient.cs`, `src/Edfx.ApiClient/SampleData.cs`; Test `tests/Edfx.ApiClient.Tests/MockClientTests.cs`.

- [ ] **Step 1: Write failing test**

```csharp
using Edfx.ApiClient; using Xunit;
public class MockClientTests
{
    [Fact]
    public async Task Mock_returns_canned_search_and_sections()
    {
        IEdfxClient sut = new MockEdfxClient();
        var (s, _) = await sut.SearchAsync("Apple");
        Assert.NotEmpty(s.Entities);
        var (raw, status) = await sut.ExtractAsync("pds", new[] { "US942404110" });
        Assert.Equal(200, status);
        Assert.Contains("pd", raw);
    }
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** (canned responses keyed by section, from User-Guide samples)

```csharp
// MockEdfxClient.cs
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
```

```csharp
// SampleData.cs — canned JSON strings copied from the User Guide samples
namespace Edfx.ApiClient;
public static class SampleData
{
    public const string Search = """{"entities":[{"entityId":"US942404110","internationalName":"APPLE, INC.","countryName":"United States of America","ticker":"AAPL","hasFinancials":"Yes"}],"total":1}""";
    public const string Pd = """{"entities":[{"entityId":"US942404110","asOfDate":"2026-06-01","pd":0.00289,"impliedRating":"Aa1","confidence":"PF-G-S"}]}""";
    public static string ForSection(string section) => section.StartsWith("pds") ? Pd : "{}";
    public static string ForPath(string path) => path.Contains("search") ? Search : "{}";
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(client): mock/sandbox EDFX client"`

---

## Phase 3 — Storage (Supabase/Postgres) with versioning

### Task 9: SQL migrations

**Files:** Create `migrations/001_core.sql`, `migrations/002_projections.sql`.

- [ ] **Step 1: Write `001_core.sql`**

```sql
create table if not exists entities (
    entity_id     text primary key,
    pid           text,
    orbis_id      text,
    name          text,
    country       text,
    city          text,
    industry_ndy  text,
    identifiers   jsonb default '{}'::jsonb,
    peer_group_ids jsonb default '[]'::jsonb,
    first_seen_at timestamptz not null default now(),
    last_seen_at  timestamptz not null default now()
);

create table if not exists extractions (
    id             uuid primary key default gen_random_uuid(),
    entity_id      text references entities(entity_id),
    section        text not null,
    version        int  not null,
    requested_at   timestamptz not null default now(),
    request_params jsonb,
    http_status    int,
    status         text not null,
    raw_json       jsonb,
    error_detail   text,
    unique (entity_id, section, version)
);
create index if not exists ix_extractions_entity_section on extractions(entity_id, section, version desc);
```

- [ ] **Step 2: Write `002_projections.sql`**

```sql
create table if not exists pd_values (
    extraction_id uuid references extractions(id), entity_id text, version int,
    as_of date, pd double precision, implied_rating text, term text );
create table if not exists financial_ratios (
    extraction_id uuid references extractions(id), entity_id text, version int,
    ratio_name text, value double precision, period text );
create table if not exists peer_metrics (
    extraction_id uuid references extractions(id), entity_id text, version int,
    metric text, entity_value double precision, percentile double precision );
create table if not exists early_warning (
    extraction_id uuid references extractions(id), entity_id text, version int,
    risk_category text, trigger text, severity text );
create table if not exists credit_limits (
    extraction_id uuid references extractions(id), entity_id text, version int,
    limit_amount double precision, currency text, horizon text );
```

- [ ] **Step 3: Commit** — `git add migrations && git commit -m "feat(db): core + projection migrations"`

### Task 10: Db connection helper + integration-test harness

**Files:** Create `src/Edfx.Storage/Db.cs`; Test `tests/Edfx.Storage.Tests/DbFixture.cs`.

> **Integration tests** need a real Postgres. Use a local Docker Postgres (or a Supabase test project). Tests skip when `EDFX_TEST_DB` is unset so CI stays green without a DB.

- [ ] **Step 1: Write `Db.cs`**

```csharp
using Npgsql;
namespace Edfx.Storage;
public class Db
{
    private readonly string _conn;
    public Db(string conn) { _conn = conn; }
    public NpgsqlConnection Open()
    {
        var c = new NpgsqlConnection(_conn); c.Open(); return c;
    }
}
```

- [ ] **Step 2: Write `DbFixture.cs`** (skips when env unset; applies migrations)

```csharp
using Npgsql; using Xunit;
public class DbFixture
{
    public string? Conn => Environment.GetEnvironmentVariable("EDFX_TEST_DB");
    public bool Available => !string.IsNullOrEmpty(Conn);
    public void ApplyMigrations()
    {
        using var c = new NpgsqlConnection(Conn); c.Open();
        foreach (var f in Directory.GetFiles("../../../../../migrations").OrderBy(x => x))
            using (var cmd = new NpgsqlCommand(File.ReadAllText(f), c)) cmd.ExecuteNonQuery();
    }
}
public class SkippableFact : FactAttribute
{
    public SkippableFact() { if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("EDFX_TEST_DB"))) Skip = "EDFX_TEST_DB not set"; }
}
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(storage): Db helper + skippable integration harness"`

### Task 11: ExtractionRepository with auto-incrementing version

**Files:** Create `src/Edfx.Storage/ExtractionRepository.cs`; Test `tests/Edfx.Storage.Tests/ExtractionRepositoryTests.cs`.

- [ ] **Step 1: Write failing test** (two saves of same entity+section → versions 1 then 2; raw JSON round-trips)

```csharp
using Edfx.Storage; using Xunit;
public class ExtractionRepositoryTests : IClassFixture<DbFixture>
{
    private readonly DbFixture _f;
    public ExtractionRepositoryTests(DbFixture f) { _f = f; if (_f.Available) _f.ApplyMigrations(); }

    [SkippableFact]
    public void Save_increments_version_per_entity_section()
    {
        var repo = new ExtractionRepository(new Db(_f.Conn!));
        repo.UpsertEntity("E1", "ACME", "US");
        var v1 = repo.SaveExtraction("E1", "pds", "{\"pd\":0.01}", 200, "ok", "{}");
        var v2 = repo.SaveExtraction("E1", "pds", "{\"pd\":0.02}", 200, "ok", "{}");
        Assert.Equal(1, v1.Version);
        Assert.Equal(2, v2.Version);
        Assert.Equal("{\"pd\":0.02}", repo.LatestRaw("E1", "pds"));
    }
}
```

- [ ] **Step 2: Run, expect fail** (skips if no DB; otherwise compile error).

- [ ] **Step 3: Implement**

```csharp
using Npgsql; using NpgsqlTypes;
namespace Edfx.Storage;
public record ExtractionRow(Guid Id, int Version);
public class ExtractionRepository
{
    private readonly Db _db;
    public ExtractionRepository(Db db) { _db = db; }

    public void UpsertEntity(string entityId, string? name, string? country)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            insert into entities(entity_id,name,country) values(@id,@n,@c)
            on conflict(entity_id) do update set name=excluded.name,
              country=excluded.country, last_seen_at=now();
            """, c);
        cmd.Parameters.AddWithValue("id", entityId);
        cmd.Parameters.AddWithValue("n", (object?)name ?? DBNull.Value);
        cmd.Parameters.AddWithValue("c", (object?)country ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public ExtractionRow SaveExtraction(string entityId, string section, string rawJson,
        int httpStatus, string status, string requestParams)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            insert into extractions(entity_id,section,version,request_params,http_status,status,raw_json)
            values(@e,@s,
               (select coalesce(max(version),0)+1 from extractions where entity_id=@e and section=@s),
               @p::jsonb,@h,@st,@r::jsonb)
            returning id, version;
            """, c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("s", section);
        cmd.Parameters.AddWithValue("p", requestParams);
        cmd.Parameters.AddWithValue("h", httpStatus);
        cmd.Parameters.AddWithValue("st", status);
        cmd.Parameters.AddWithValue("r", rawJson);
        using var rd = cmd.ExecuteReader(); rd.Read();
        return new ExtractionRow(rd.GetGuid(0), rd.GetInt32(1));
    }

    public string? LatestRaw(string entityId, string section)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            "select raw_json::text from extractions where entity_id=@e and section=@s order by version desc limit 1", c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("s", section);
        return cmd.ExecuteScalar() as string;
    }
}
```

- [ ] **Step 4: Run with DB** — Run: `EDFX_TEST_DB="Host=localhost;Username=postgres;Password=postgres;Database=edfx_test" dotnet test tests/Edfx.Storage.Tests` → PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(storage): versioned extraction repository"`

### Task 12: History queries (list + diff)

**Files:** Modify `src/Edfx.Storage/ExtractionRepository.cs`; Test add to `ExtractionRepositoryTests.cs`.

- [ ] **Step 1: Write failing test**

```csharp
[SkippableFact]
public void Lists_versions_and_returns_specific_version_raw()
{
    var repo = new ExtractionRepository(new Db(_f.Conn!));
    repo.UpsertEntity("E2","X","US");
    repo.SaveExtraction("E2","ratios","{\"a\":1}",200,"ok","{}");
    repo.SaveExtraction("E2","ratios","{\"a\":2}",200,"ok","{}");
    var hist = repo.History("E2","ratios");
    Assert.Equal(2, hist.Count);
    Assert.Equal("{\"a\":1}", repo.RawAtVersion("E2","ratios",1));
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```csharp
public record HistoryItem(int Version, DateTimeOffset RequestedAt, int HttpStatus, string Status);

public List<HistoryItem> History(string entityId, string section)
{
    using var c = _db.Open();
    using var cmd = new NpgsqlCommand(
        "select version, requested_at, http_status, status from extractions where entity_id=@e and section=@s order by version desc", c);
    cmd.Parameters.AddWithValue("e", entityId); cmd.Parameters.AddWithValue("s", section);
    var list = new List<HistoryItem>(); using var rd = cmd.ExecuteReader();
    while (rd.Read()) list.Add(new HistoryItem(rd.GetInt32(0),
        rd.GetFieldValue<DateTimeOffset>(1), rd.GetInt32(2), rd.GetString(3)));
    return list;
}

public string? RawAtVersion(string entityId, string section, int version)
{
    using var c = _db.Open();
    using var cmd = new NpgsqlCommand(
        "select raw_json::text from extractions where entity_id=@e and section=@s and version=@v", c);
    cmd.Parameters.AddWithValue("e", entityId); cmd.Parameters.AddWithValue("s", section);
    cmd.Parameters.AddWithValue("v", version);
    return cmd.ExecuteScalar() as string;
}
```

- [ ] **Step 4: Run with DB, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(storage): history listing + version retrieval"`

---

## Phase 4 — Web app: services, DI, pages

### Task 13: ExtractionService (orchestrates client → storage)

**Files:** Create `src/Edfx.Web/Services/ExtractionService.cs`; Test `tests/Edfx.Web.Tests/ExtractionServiceTests.cs`.

- [ ] **Step 1: Write failing test** (calls client, persists raw, returns row) using a fake `IEdfxClient` + in-memory repo seam

```csharp
using Edfx.ApiClient; using Edfx.Web.Services; using NSubstitute; using Xunit;
public class ExtractionServiceTests
{
    [Fact]
    public async Task Extract_calls_client_and_saves_raw()
    {
        var client = Substitute.For<IEdfxClient>();
        client.ExtractAsync("pds", Arg.Any<IEnumerable<string>>(), null, null, null)
              .Returns(("{\"entities\":[{\"pd\":0.01}]}", 200));
        var saver = Substitute.For<IExtractionSaver>();
        saver.Save("E1","pds","{\"entities\":[{\"pd\":0.01}]}",200,"ok").Returns(7);
        var sut = new ExtractionService(client, saver);

        var result = await sut.ExtractAndSaveAsync("E1", "pds");
        Assert.Equal(200, result.HttpStatus);
        Assert.Equal(7, result.Version);
        await client.Received().ExtractAsync("pds", Arg.Any<IEnumerable<string>>(), null, null, null);
        saver.Received().Save("E1","pds", Arg.Any<string>(), 200, "ok");
    }
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** (introduce `IExtractionSaver` seam over the repo so Web tests don't need a DB)

```csharp
// IExtractionSaver.cs
namespace Edfx.Web.Services;
public interface IExtractionSaver { int Save(string entityId, string section, string raw, int httpStatus, string status); }
```

```csharp
// ExtractionService.cs
using Edfx.ApiClient;
namespace Edfx.Web.Services;
public record ExtractResult(string Section, int Version, int HttpStatus, string Status, string Raw);
public class ExtractionService
{
    private readonly IEdfxClient _client; private readonly IExtractionSaver _saver;
    public ExtractionService(IEdfxClient client, IExtractionSaver saver) { _client = client; _saver = saver; }

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
        { onProgress?.Invoke(s); results.Add(await ExtractAndSaveAsync(entityId, s)); }
        return results;
    }
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(web): ExtractionService orchestrating client+storage"`

### Task 14: SaverAdapter + DI wiring + config

**Files:** Create `src/Edfx.Web/Services/SaverAdapter.cs`; Modify `src/Edfx.Web/Program.cs`, `src/Edfx.Web/appsettings.json`.

- [ ] **Step 1: Implement SaverAdapter** (adapts repo to `IExtractionSaver`)

```csharp
using Edfx.Storage;
namespace Edfx.Web.Services;
public class SaverAdapter : IExtractionSaver
{
    private readonly ExtractionRepository _repo;
    public SaverAdapter(ExtractionRepository repo) { _repo = repo; }
    public int Save(string entityId, string section, string raw, int httpStatus, string status)
        => _repo.SaveExtraction(entityId, section, raw, httpStatus, status, "{}").Version;
}
```

- [ ] **Step 2: Wire DI in `Program.cs`** (add after `builder.Services.AddRazorComponents`/server services)

```csharp
using Edfx.ApiClient; using Edfx.Storage; using Edfx.Web.Services;

var edfx = new EdfxOptions
{
    Username  = builder.Configuration["EDFX_USERNAME"] ?? "",
    Password  = builder.Configuration["EDFX_PASSWORD"] ?? "",
    BaseUrl   = builder.Configuration["EDFX_BASE_URL"]  ?? "https://api.edfx.moodysanalytics.com/edfx/v1/",
    TokenUrl  = builder.Configuration["EDFX_TOKEN_URL"] ?? "https://sso.moodysanalytics.com/sso-api/v1/token",
    UseMock   = bool.TryParse(builder.Configuration["EDFX_USE_MOCK"], out var m) && m
};
builder.Services.AddSingleton(edfx);
builder.Services.AddHttpClient<TokenProvider>();
builder.Services.AddHttpClient<EdfxClient>()
    .AddTransientHttpErrorPolicy(p => p.WaitAndRetryAsync(3,
        n => TimeSpan.FromMilliseconds(300 * Math.Pow(2, n))));   // Polly backoff
builder.Services.AddSingleton<IEdfxClient>(sp => edfx.UseMock
    ? new MockEdfxClient()
    : sp.GetRequiredService<EdfxClient>());
builder.Services.AddSingleton(new Db(builder.Configuration["SUPABASE_DB_CONNECTION"] ?? ""));
builder.Services.AddScoped<ExtractionRepository>();
builder.Services.AddScoped<IExtractionSaver, SaverAdapter>();
builder.Services.AddScoped<ExtractionService>();
```

- [ ] **Step 3: Build** — Run: `dotnet build` → succeeds.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(web): DI wiring, Polly retry, mock toggle"`

### Task 15: Exporter (Excel + CSV)

**Files:** Create `src/Edfx.Web/Services/Exporter.cs`; Test `tests/Edfx.Web.Tests/ExporterTests.cs`.

- [ ] **Step 1: Write failing test** (rows → non-empty xlsx and csv bytes; csv has header)

```csharp
using Edfx.Web.Services; using System.Text; using Xunit;
public class ExporterTests
{
    [Fact]
    public void Csv_has_header_and_rows()
    {
        var rows = new List<Dictionary<string,object?>>
        { new() { ["metric"]="pd", ["value"]=0.01 } };
        var csv = Encoding.UTF8.GetString(Exporter.ToCsv(rows));
        Assert.Contains("metric,value", csv);
        Assert.Contains("pd,0.01", csv);
    }
    [Fact]
    public void Xlsx_is_nonempty()
    {
        var rows = new List<Dictionary<string,object?>> { new() { ["a"]=1 } };
        Assert.True(Exporter.ToXlsx(("Sheet1", rows)).Length > 0);
    }
}
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```csharp
using ClosedXML.Excel; using System.Globalization; using System.Text;
namespace Edfx.Web.Services;
public static class Exporter
{
    public static byte[] ToCsv(List<Dictionary<string, object?>> rows)
    {
        var sb = new StringBuilder();
        if (rows.Count == 0) return Encoding.UTF8.GetBytes("");
        var cols = rows[0].Keys.ToList();
        sb.AppendLine(string.Join(",", cols));
        foreach (var r in rows)
            sb.AppendLine(string.Join(",", cols.Select(c => Format(r.GetValueOrDefault(c)))));
        return Encoding.UTF8.GetBytes(sb.ToString());
    }
    public static byte[] ToXlsx(params (string sheet, List<Dictionary<string, object?>> rows)[] sheets)
    {
        using var wb = new XLWorkbook();
        foreach (var (sheet, rows) in sheets)
        {
            var ws = wb.Worksheets.Add(sheet);
            if (rows.Count == 0) continue;
            var cols = rows[0].Keys.ToList();
            for (int i = 0; i < cols.Count; i++) ws.Cell(1, i + 1).Value = cols[i];
            for (int r = 0; r < rows.Count; r++)
                for (int c = 0; c < cols.Count; c++)
                    ws.Cell(r + 2, c + 1).Value = rows[r].GetValueOrDefault(cols[c])?.ToString();
        }
        using var ms = new MemoryStream(); wb.SaveAs(ms); return ms.ToArray();
    }
    private static string Format(object? v) => v switch
    {
        null => "",
        double d => d.ToString(CultureInfo.InvariantCulture),
        _ => v.ToString()!.Contains(',') ? $"\"{v}\"" : v.ToString()!
    };
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(web): Excel + CSV exporter"`

### Task 16: Search page

**Files:** Create `src/Edfx.Web/Components/Pages/Search.razor`; Modify nav (`Components/Layout/NavMenu.razor`).

- [ ] **Step 1: Implement page** (search box → grid → link to dashboard)

```razor
@page "/"
@using Edfx.ApiClient
@using Edfx.Domain
@inject IEdfxClient Client
<h1>EDF-X Entity Search</h1>
<input @bind="query" placeholder="Name, BVDID, ISIN, CUSIP, LEI, PID, ticker" style="width:420px" />
<button @onclick="Run" disabled="@busy">Search</button>
@if (busy) { <p>Searching…</p> }
@if (result is not null)
{
  <p>@result.Total matches (showing @result.Entities.Count)</p>
  <table class="table">
    <thead><tr><th>Name</th><th>Country</th><th>Industry</th><th>Ticker</th><th>Financials</th><th></th></tr></thead>
    <tbody>
      @foreach (var e in result.Entities)
      {
        <tr>
          <td>@e.InternationalName</td><td>@e.CountryName</td>
          <td>@e.PrimaryIndustryNDYDescription</td><td>@e.Ticker</td><td>@e.HasFinancials</td>
          <td><a href="@($"/entity/{e.EntityId}")">Open</a></td>
        </tr>
      }
    </tbody>
  </table>
}
@code {
  string query = ""; bool busy; EntitySearchResponse? result;
  async Task Run() { busy = true; try { (result, _) = await Client.SearchAsync(query); } finally { busy = false; } }
}
```

- [ ] **Step 2: Add nav link** in `NavMenu.razor`:

```razor
<div class="nav-item px-3"><NavLink class="nav-link" href="" Match="NavLinkMatch.All">Search</NavLink></div>
<div class="nav-item px-3"><NavLink class="nav-link" href="batch">Batch</NavLink></div>
<div class="nav-item px-3"><NavLink class="nav-link" href="history">History</NavLink></div>
```

- [ ] **Step 3: Run app in mock mode** — Run: `EDFX_USE_MOCK=true dotnet run --project src/Edfx.Web` then open `/`, search "Apple", see Apple row. Stop with Ctrl-C.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(web): entity search page"`

### Task 17: Entity Dashboard with per-section panels + Extract All

**Files:** Create `src/Edfx.Web/Components/Pages/Entity.razor`, `src/Edfx.Web/Components/SectionPanel.razor`.

- [ ] **Step 1: Implement SectionPanel** (Extract button → shows version/status/raw + export buttons)

```razor
@using Edfx.Web.Services
@inject ExtractionService Extractor
@inject IJSRuntime JS
<div class="card mb-2"><div class="card-body">
  <h5>@Title <small class="text-muted">@status</small></h5>
  <button class="btn btn-primary btn-sm" @onclick="Extract" disabled="@busy">Extract</button>
  @if (raw is not null)
  {
    <span class="ms-2">v@version · HTTP @http</span>
    <pre style="max-height:240px;overflow:auto">@raw</pre>
  }
</div></div>
@code {
  [Parameter] public string EntityId { get; set; } = "";
  [Parameter] public string Section { get; set; } = "";
  [Parameter] public string Title { get; set; } = "";
  bool busy; string? raw; int version; int http; string status = "";
  async Task Extract()
  {
    busy = true; status = "running…";
    try { var r = await Extractor.ExtractAndSaveAsync(EntityId, Section);
          raw = r.Raw; version = r.Version; http = r.HttpStatus; status = r.Status; }
    finally { busy = false; }
  }
}
```

- [ ] **Step 2: Implement Entity dashboard** (header + one panel per section + Extract All)

```razor
@page "/entity/{EntityId}"
@using Edfx.ApiClient
@using Edfx.Web.Services
@inject ExtractionService Extractor
<h2>Entity @EntityId</h2>
<button class="btn btn-success mb-3" @onclick="ExtractAll" disabled="@running">Extract All Sections</button>
@if (running) { <p>Extracting @current…</p> }
@foreach (var s in Sections)
{
  <SectionPanel EntityId="@EntityId" Section="@s.Key" Title="@s.Title" />
}
@code {
  [Parameter] public string EntityId { get; set; } = "";
  bool running; string current = "";
  record Sec(string Key, string Title);
  static readonly Sec[] Sections =
  {
    new("pds","PD (best estimate)"), new("pds_creditedge","PD — CreditEdge"),
    new("pds_riskcalc","PD — RiskCalc"), new("pds_payment","PD — Payment"),
    new("statements","Financial Statements"), new("ratios","Financial Ratios"),
    new("ratios_calculate","Ratios (calculated)"),
    new("peers_id","Peer Group IDs"), new("peers_metrics","Peer Metrics"),
    new("peers_percentile","Peer Percentile"), new("peers_metadata","Peer Metadata"),
    new("peers_recommended","Recommended Peers"),
    new("risk_category","Early Warning — Risk Category"), new("triggers","Early Warning — Triggers"),
    new("credit_limit","Credit Limit")
  };
  async Task ExtractAll()
  {
    running = true;
    try { await Extractor.ExtractAllAsync(EntityId, Sections.Select(s => s.Key),
            s => { current = s; InvokeAsync(StateHasChanged); }); }
    finally { running = false; }
  }
}
```

- [ ] **Step 3: Run in mock mode**, open `/entity/US942404110`, click a panel's Extract → see version + raw JSON; click Extract All → progress runs.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(web): entity dashboard + section panels + extract all"`

### Task 18: Per-section export endpoints

**Files:** Create `src/Edfx.Web/Controllers/ExportController.cs`; Modify `Program.cs` (`builder.Services.AddControllers()` + `app.MapControllers()`).

- [ ] **Step 1: Implement** (download latest extraction of a section as CSV/XLSX by flattening raw JSON arrays)

```csharp
using Edfx.Storage; using Edfx.Web.Services; using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
namespace Edfx.Web.Controllers;
[ApiController][Route("export")]
public class ExportController : ControllerBase
{
    private readonly ExtractionRepository _repo;
    public ExportController(ExtractionRepository repo) { _repo = repo; }

    [HttpGet("{entityId}/{section}.{fmt}")]
    public IActionResult Download(string entityId, string section, string fmt)
    {
        var raw = _repo.LatestRaw(entityId, section);
        if (raw is null) return NotFound();
        var rows = Flatten(raw);
        return fmt == "csv"
            ? File(Exporter.ToCsv(rows), "text/csv", $"{entityId}_{section}.csv")
            : File(Exporter.ToXlsx((section, rows)), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{entityId}_{section}.xlsx");
    }

    private static List<Dictionary<string, object?>> Flatten(string raw)
    {
        using var doc = JsonDocument.Parse(raw);
        var rows = new List<Dictionary<string, object?>>();
        void AddObj(JsonElement o)
        {
            var d = new Dictionary<string, object?>();
            foreach (var p in o.EnumerateObject())
                if (p.Value.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array))
                    d[p.Name] = p.Value.ToString();
            if (d.Count > 0) rows.Add(d);
        }
        var root = doc.RootElement;
        if (root.TryGetProperty("entities", out var ents) && ents.ValueKind == JsonValueKind.Array)
            foreach (var e in ents.EnumerateArray()) AddObj(e);
        else AddObj(root);
        return rows;
    }
}
```

- [ ] **Step 2: Add to `Program.cs`** — `builder.Services.AddControllers();` and `app.MapControllers();`

- [ ] **Step 3: Add export links** to `SectionPanel.razor` (under the raw block):

```razor
@if (raw is not null)
{
  <a class="btn btn-outline-secondary btn-sm" href="@($"/export/{EntityId}/{Section}.csv")">CSV</a>
  <a class="btn btn-outline-secondary btn-sm" href="@($"/export/{EntityId}/{Section}.xlsx")">Excel</a>
}
```

- [ ] **Step 4: Run**, extract a section, click CSV → file downloads with rows.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(web): per-section CSV/Excel export"`

### Task 19: Batch page

**Files:** Create `src/Edfx.Web/Components/Pages/Batch.razor`.

- [ ] **Step 1: Implement** (textarea of identifiers → resolve via search → extract selected sections for each)

```razor
@page "/batch"
@using Edfx.ApiClient
@using Edfx.Web.Services
@inject IEdfxClient Client
@inject ExtractionService Extractor
<h2>Batch Extraction</h2>
<textarea @bind="input" rows="6" style="width:520px" placeholder="One identifier per line"></textarea>
<div>@foreach (var s in All) {
  <label class="me-2"><input type="checkbox" checked="@picked.Contains(s)" @onchange="e => Toggle(s, e)" /> @s</label> }
</div>
<button class="btn btn-success" @onclick="Run" disabled="@busy">Run Batch</button>
@if (busy) { <p>@done / @total done…</p> }
<ul>@foreach (var line in logLines) { <li>@line</li> }</ul>
@code {
  string input = ""; bool busy; int done, total;
  readonly List<string> logLines = new();
  static readonly string[] All = EdfxClient.AllSections;
  readonly HashSet<string> picked = new(new[] { "pds", "ratios", "risk_category", "credit_limit" });
  void Toggle(string s, ChangeEventArgs e) { if ((bool)e.Value!) picked.Add(s); else picked.Remove(s); }
  async Task Run()
  {
    busy = true; logLines.Clear();
    var ids = input.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    total = ids.Length;
    foreach (var id in ids)
    {
      var (s, _) = await Client.SearchAsync(id);
      var entityId = s.Entities.FirstOrDefault()?.EntityId ?? id;
      await Extractor.ExtractAllAsync(entityId, picked);
      done++; logLines.Add($"{id} → {entityId}: {picked.Count} sections"); StateHasChanged();
    }
    busy = false;
  }
}
```

- [ ] **Step 2: Run in mock mode**, paste two names, run, see log lines.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(web): batch extraction page"`

### Task 20: History page (browse + version diff + re-export)

**Files:** Create `src/Edfx.Web/Components/Pages/History.razor`.

- [ ] **Step 1: Implement** (enter entity → list sections+versions; pick two versions of a section → text diff)

```razor
@page "/history"
@using Edfx.Storage
@inject ExtractionRepository Repo
<h2>Extraction History</h2>
<input @bind="entityId" placeholder="entityId (BVDID)" />
<input @bind="section" placeholder="section e.g. pds" />
<button class="btn btn-primary" @onclick="Load">Load</button>
@if (items is not null)
{
  <table class="table"><thead><tr><th>Version</th><th>When</th><th>HTTP</th><th>Status</th><th></th></tr></thead>
  <tbody>@foreach (var h in items)
  { <tr><td>@h.Version</td><td>@h.RequestedAt</td><td>@h.HttpStatus</td><td>@h.Status</td>
        <td><a href="@($"/export/{entityId}/{section}.xlsx")">Excel</a></td></tr> }
  </tbody></table>
  <div>
    <input @bind="vA" placeholder="ver A" style="width:80px" />
    <input @bind="vB" placeholder="ver B" style="width:80px" />
    <button class="btn btn-outline-secondary" @onclick="Diff">Diff</button>
  </div>
  <pre>@diff</pre>
}
@code {
  string entityId = "", section = ""; int vA, vB; string diff = "";
  List<Edfx.Storage.HistoryItem>? items;
  void Load() => items = Repo.History(entityId, section);
  void Diff()
  {
    var a = Repo.RawAtVersion(entityId, section, vA) ?? "";
    var b = Repo.RawAtVersion(entityId, section, vB) ?? "";
    diff = a == b ? "(identical)" : $"--- v{vA}\n{a}\n\n+++ v{vB}\n{b}";
  }
}
```

- [ ] **Step 2: Run with DB**, load history for an entity you extracted, diff v1 vs v2.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(web): history browse, diff, re-export"`

### Task 21: Uploads page (financial statements + processes)

**Files:** Create `src/Edfx.Web/Components/Pages/Uploads.razor`; add client methods `DownloadTemplateAsync`, `UploadModelInputsAsync`, `ProcessStatusAsync` to `EdfxClient`/`IEdfxClient`.

- [ ] **Step 1: Add client methods** (GET templates; POST CSV to `entities/modelInputs`; GET `processes/{id}/status`)

```csharp
// add to IEdfxClient.cs
Task<byte[]> DownloadTemplateAsync(string kind);                 // "universal" | "bank"
Task<(string raw, int status)> UploadModelInputsAsync(byte[] csv, string fileName);
Task<(string raw, int status)> ProcessStatusAsync(string processId);
```

```csharp
// add to EdfxClient.cs
public async Task<byte[]> DownloadTemplateAsync(string kind)
{
    var req = new HttpRequestMessage(HttpMethod.Get, $"entities/financials/template/{kind}");
    req.Headers.Add("Authorization", $"Bearer {await _tokens.GetTokenAsync()}");
    var resp = await _http.SendAsync(req); return await resp.Content.ReadAsByteArrayAsync();
}
public async Task<(string, int)> UploadModelInputsAsync(byte[] csv, string fileName)
{
    var content = new MultipartFormDataContent();
    var file = new ByteArrayContent(csv);
    file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/csv");
    content.Add(file, "file", fileName);
    var req = new HttpRequestMessage(HttpMethod.Post, "entities/modelInputs") { Content = content };
    req.Headers.Add("Authorization", $"Bearer {await _tokens.GetTokenAsync()}");
    var resp = await _http.SendAsync(req);
    return (await resp.Content.ReadAsStringAsync(), (int)resp.StatusCode);
}
public async Task<(string, int)> ProcessStatusAsync(string processId)
{
    var req = new HttpRequestMessage(HttpMethod.Get, $"processes/{processId}/status");
    req.Headers.Add("Authorization", $"Bearer {await _tokens.GetTokenAsync()}");
    var resp = await _http.SendAsync(req);
    return (await resp.Content.ReadAsStringAsync(), (int)resp.StatusCode);
}
```

Add no-op implementations to `MockEdfxClient` (return empty bytes / `("{}",200)`).

- [ ] **Step 2: Implement Uploads page** (download template links + file upload + status poll button)

```razor
@page "/uploads"
@using Edfx.ApiClient
@inject IEdfxClient Client
@inject IJSRuntime JS
<h2>Upload Financials</h2>
<button class="btn btn-outline-primary" @onclick='() => Get("universal")'>Universal template</button>
<button class="btn btn-outline-primary" @onclick='() => Get("bank")'>Bank template</button>
<hr/>
<InputFile OnChange="OnFile" />
<button class="btn btn-success" @onclick="Upload" disabled="@(bytes is null)">Upload CSV</button>
<p>@msg</p>
@if (processId is not null)
{
  <button class="btn btn-secondary" @onclick="Poll">Check status</button> <span>@statusText</span>
}
@code {
  byte[]? bytes; string fileName = ""; string msg = ""; string? processId; string statusText = "";
  async Task Get(string kind)
  {
    var data = await Client.DownloadTemplateAsync(kind);
    await JS.InvokeVoidAsync("edfxDownload", $"{kind}_template.xlsx", Convert.ToBase64String(data));
  }
  async Task OnFile(InputFileChangeEventArgs e)
  {
    using var ms = new MemoryStream(); await e.File.OpenReadStream(20_000_000).CopyToAsync(ms);
    bytes = ms.ToArray(); fileName = e.File.Name;
  }
  async Task Upload()
  {
    var (raw, status) = await Client.UploadModelInputsAsync(bytes!, fileName);
    msg = $"HTTP {status}"; 
    using var d = System.Text.Json.JsonDocument.Parse(raw);
    if (d.RootElement.TryGetProperty("processId", out var p)) processId = p.GetString();
  }
  async Task Poll() { var (raw, _) = await Client.ProcessStatusAsync(processId!); statusText = raw; }
}
```

- [ ] **Step 3: Add JS download helper** in `Components/App.razor` (before `</body>`):

```html
<script>
  window.edfxDownload = (name, b64) => {
    const a = document.createElement('a');
    a.href = 'data:application/octet-stream;base64,' + b64; a.download = name; a.click();
  };
</script>
```

- [ ] **Step 4: Build + run in mock mode**, page renders, template buttons callable.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(web): uploads page (templates, modelInputs, process status)"`

---

## Phase 5 — Deployment

### Task 22: Dockerfile

**Files:** Create `Dockerfile`.

- [ ] **Step 1: Write**

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/Edfx.Web -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Edfx.Web.dll"]
```

- [ ] **Step 2: Build image** — Run: `docker build -t edfx-web .` → succeeds.

- [ ] **Step 3: Commit** — `git add Dockerfile && git commit -m "build: Dockerfile for Edfx.Web"`

### Task 23: README + run instructions

**Files:** Create `README.md`.

- [ ] **Step 1: Write** README covering: env vars, `EDFX_USE_MOCK=true` local run, applying migrations (`psql "$SUPABASE_DB_CONNECTION" -f migrations/001_core.sql` etc.), `docker run -p 8080:8080 --env-file .env edfx-web`, and the Supabase connection-string location (Project → Settings → Database → Connection string / URI, use the pooled `6543` port for serverless or `5432` direct).

- [ ] **Step 2: Commit** — `git add README.md && git commit -m "docs: README with setup, mock mode, migrations, deploy"`

### Task 24: Deploy config (Render default)

**Files:** Create `render.yaml`.

- [ ] **Step 1: Write** (host-agnostic Docker; Render shown as the documented default)

```yaml
services:
  - type: web
    name: edfx-web
    runtime: docker
    plan: free
    envVars:
      - key: EDFX_USERNAME
        sync: false
      - key: EDFX_PASSWORD
        sync: false
      - key: EDFX_BASE_URL
        value: https://api.edfx.moodysanalytics.com/edfx/v1/
      - key: EDFX_TOKEN_URL
        value: https://sso.moodysanalytics.com/sso-api/v1/token
      - key: SUPABASE_DB_CONNECTION
        sync: false
      - key: EDFX_USE_MOCK
        value: "false"
```

- [ ] **Step 2: Commit** — `git add render.yaml && git commit -m "build: Render deploy config (Docker, secrets via dashboard)"`

---

## Phase 6 — End-to-end verification

### Task 25: Live smoke test (with real credentials)

- [ ] **Step 1:** Set env: `EDFX_USERNAME`, `EDFX_PASSWORD`, `SUPABASE_DB_CONNECTION`, `EDFX_USE_MOCK=false`. Apply migrations to Supabase.
- [ ] **Step 2:** `dotnet run --project src/Edfx.Web`. Search "Apple Inc" → confirm real results.
- [ ] **Step 3:** Open the Apple entity → Extract All → confirm each panel shows HTTP 200 and a version.
- [ ] **Step 4:** In Supabase SQL editor: `select section, version, http_status from extractions order by requested_at desc limit 20;` → rows present.
- [ ] **Step 5:** Export one section to Excel → opens in Excel with data.
- [ ] **Step 6:** Re-run Extract All → versions increment to 2. Confirm History diff shows v1 vs v2.
- [ ] **Step 7:** Commit any fixes — `git commit -am "fix: live smoke-test adjustments"`.

---

## Self-review notes (addressed)

- **Spec coverage:** search (T16), all PD variants + financials/ratios/peers/early-warning/credit-limit (T7, T17), uploads/processes (T21), versioned Supabase store (T9–T12), export (T15,T18), batch (T19), history+diff (T20), mock mode (T8), deployment (T22–T24), secrets server-side (T14). ✓
- **Type consistency:** `ExtractAsync(section, ids, start, end, freq)` signature identical in client (T7), service (T13), tests. `IExtractionSaver.Save(...)→int` matches adapter (T14) and service (T13). `HistoryItem` / `RawAtVersion` from T12 used in T20. ✓
- **Known follow-ups (non-blocking):** projection tables (`pd_values` etc.) are created in T9 but populated in a later iteration — raw JSON + export cover all data needs for v1; populating projections is additive and lossless. Field names per section to be confirmed against User-Guide appendix pp.71–80 when wiring real responses.
