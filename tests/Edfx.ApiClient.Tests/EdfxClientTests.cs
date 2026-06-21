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
