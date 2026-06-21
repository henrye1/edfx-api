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
