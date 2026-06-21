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
        Assert.Contains(server.LogEntries, e => e.RequestMessage?.Path == path);
    }
}
