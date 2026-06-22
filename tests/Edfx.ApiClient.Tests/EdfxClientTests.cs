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
        // Search lives at the HOST ROOT, not under the /edfx/v1/ base. A realistic base URL
        // with the /edfx/v1/ prefix guards the regression: without the leading slash in
        // EdfxClient, this would resolve to /edfx/v1/entity/v1/search and fail to match.
        server.Given(Request.Create().WithPath("/entity/v1/search").UsingPost()
                 .WithHeader("Authorization", "Bearer T1"))
              .RespondWith(Response.Create().WithStatusCode(200)
                 .WithBody("""{"entities":[{"entityId":"X","internationalName":"ACME"}],"total":1}"""));
        var opts = new EdfxOptions { Username="u", Password="p",
            TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/edfx/v1/" };
        var http = new HttpClient { BaseAddress = new Uri(server.Url + "/edfx/v1/") };
        var sut = new EdfxClient(http, new TokenProvider(new HttpClient(), opts), opts);

        var (typed, raw) = await sut.SearchAsync("ACME");
        Assert.Equal("ACME", typed.Entities[0].InternationalName);
        Assert.Contains("\"total\":1", raw);
    }

    [Fact]
    public async Task Retries_once_after_401_with_refreshed_token()
    {
        var server = WireMockServer.Start();
        // token endpoint: T1 on first call, T2 on forced refresh
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .InScenario("tok").WillSetStateTo("second")
              .RespondWith(Response.Create().WithBody("""{"id_token":"T1","token_type":"Bearer"}"""));
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .InScenario("tok").WhenStateIs("second")
              .RespondWith(Response.Create().WithBody("""{"id_token":"T2","token_type":"Bearer"}"""));
        // resource: 401 on first call, 200 on retry. entities/pds is relative (no leading
        // slash), so it resolves UNDER the /edfx/v1/ base.
        server.Given(Request.Create().WithPath("/edfx/v1/entities/pds").UsingPost())
              .InScenario("res").WillSetStateTo("ok")
              .RespondWith(Response.Create().WithStatusCode(401));
        server.Given(Request.Create().WithPath("/edfx/v1/entities/pds").UsingPost())
              .InScenario("res").WhenStateIs("ok")
              .RespondWith(Response.Create().WithStatusCode(200).WithBody("""{"ok":true}"""));

        var opts = new EdfxOptions { Username = "u", Password = "p",
            TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/edfx/v1/" };
        var http = new HttpClient { BaseAddress = new Uri(server.Url + "/edfx/v1/") };
        var sut = new EdfxClient(http, new TokenProvider(new HttpClient(), opts), opts);

        var (raw, status) = await sut.PostRawAsync("entities/pds", new { });
        Assert.Equal(200, status);
        Assert.Contains("ok", raw);
    }

    [Fact]
    public async Task Extract_omits_null_date_fields_from_the_request_body()
    {
        var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .RespondWith(Response.Create().WithBody("""{"id_token":"T1","token_type":"Bearer"}"""));
        server.Given(Request.Create().WithPath("/edfx/v1/entities/pds").UsingPost())
              .RespondWith(Response.Create().WithStatusCode(200).WithBody("{}"));
        var opts = new EdfxOptions { Username = "u", Password = "p",
            TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/edfx/v1/" };
        var http = new HttpClient { BaseAddress = new Uri(server.Url + "/edfx/v1/") };
        var sut = new EdfxClient(http, new TokenProvider(new HttpClient(), opts), opts);

        await sut.ExtractAsync("pds", new[] { "E1" });

        var body = server.LogEntries.Single(e => e.RequestMessage?.Path == "/edfx/v1/entities/pds").RequestMessage?.Body ?? "";
        Assert.DoesNotContain("startDate", body);
        Assert.DoesNotContain("null", body);
        Assert.Contains("entityId", body);
    }

    [Fact]
    public async Task Triggers_resolves_peerId_from_riskCategory_then_calls_triggers()
    {
        var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .RespondWith(Response.Create().WithBody("""{"id_token":"T1","token_type":"Bearer"}"""));
        // riskCategory supplies the peerId the triggers endpoint requires.
        server.Given(Request.Create().WithPath("/edfx/v1/tools/riskCategory").UsingPost())
              .RespondWith(Response.Create().WithStatusCode(200)
                 .WithBody("""{"entities":[{"entityId":"E1","peerId":"PID-9"}]}"""));
        server.Given(Request.Create().WithPath("/edfx/v1/tools/triggers").UsingPost())
              .RespondWith(Response.Create().WithStatusCode(200).WithBody("""{"ok":true}"""));
        var opts = new EdfxOptions { Username = "u", Password = "p",
            TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/edfx/v1/" };
        var http = new HttpClient { BaseAddress = new Uri(server.Url + "/edfx/v1/") };
        var sut = new EdfxClient(http, new TokenProvider(new HttpClient(), opts), opts);

        var (raw, status) = await sut.ExtractAsync("triggers", new[] { "E1" });

        Assert.Equal(200, status);
        Assert.Contains("ok", raw);
        // The triggers request must carry the peerId resolved from riskCategory.
        var triggerCalls = server.LogEntries
            .Where(e => e.RequestMessage?.Path == "/edfx/v1/tools/triggers").ToList();
        Assert.Single(triggerCalls);
        Assert.Contains("PID-9", triggerCalls[0].RequestMessage?.Body ?? "");
    }

    [Fact]
    public async Task Triggers_surfaces_riskCategory_failure_without_calling_triggers()
    {
        var server = WireMockServer.Start();
        server.Given(Request.Create().WithPath("/token").UsingPost())
              .RespondWith(Response.Create().WithBody("""{"id_token":"T1","token_type":"Bearer"}"""));
        server.Given(Request.Create().WithPath("/edfx/v1/tools/riskCategory").UsingPost())
              .RespondWith(Response.Create().WithStatusCode(404).WithBody("""{"detail":"Not Found"}"""));
        var opts = new EdfxOptions { Username = "u", Password = "p",
            TokenUrl = server.Url + "/token", BaseUrl = server.Url + "/edfx/v1/" };
        var http = new HttpClient { BaseAddress = new Uri(server.Url + "/edfx/v1/") };
        var sut = new EdfxClient(http, new TokenProvider(new HttpClient(), opts), opts);

        var (raw, status) = await sut.ExtractAsync("triggers", new[] { "E1" });

        Assert.Equal(404, status);
        Assert.Contains("Not Found", raw);
        Assert.DoesNotContain(server.LogEntries,
            e => e.RequestMessage?.Path == "/edfx/v1/tools/triggers");
    }
}
