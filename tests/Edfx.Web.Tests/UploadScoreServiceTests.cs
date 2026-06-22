using System.Text;
using Edfx.ApiClient;
using Edfx.Web.Services;
using NSubstitute;
using Xunit;

public class UploadScoreServiceTests
{
    [Fact]
    public async Task Score_parses_inputs_uploads_and_returns_pit_ttc_and_ratios()
    {
        var client = Substitute.For<IEdfxClient>();
        client.UploadModelInputsAsync(Arg.Any<byte[]>(), Arg.Any<string>()).Returns(("{\"processId\":\"P1\"}", 200));
        client.ProcessStatusAsync("P1").Returns(("{\"status\":\"Completed\"}", 200));
        // PIT (default) and TTC (fso) both routed through entities/pds; return distinct PDs per call.
        client.PostRawAsync("entities/pds", Arg.Any<object>()).Returns(
            ("{\"entities\":[{\"pd\":0.0094,\"impliedRating\":\"Ba1\",\"asOfDate\":\"2026-06-01\",\"confidence\":\"PF-G-R\",\"confidenceDescription\":\"Private firm, RiskCalc model.\"}]}", 200),
            ("{\"entities\":[{\"pd\":0.0109,\"impliedRating\":\"Ba1\"}]}", 200));

        var csv = "entityInternationalName,totalCurrentAssets,totalCurrentLiabilities,netSales,netIncome\nTest Co,100,50,200,20\n";
        var svc = new UploadScoreService(client, new HttpClient());

        var r = await svc.ScoreAsync(Encoding.UTF8.GetBytes(csv), "inputs.csv");

        Assert.Equal("completed", r.Status);
        Assert.Equal(0.0094, r.PitPd);
        Assert.Equal(0.0109, r.TtcPd);
        Assert.Equal("Ba1", r.ImpliedRating);
        Assert.Equal("Test Co", r.EntityName);
        // financial inputs echoed (metadata column excluded)
        var inputs = Assert.Single(r.Financials).Items;
        Assert.Contains(inputs, i => i.Label == "totalCurrentAssets" && i.Value == 100);
        // derived ratio: current ratio 100/50 = 2
        Assert.Contains(r.Ratios, x => x.Label == "Current Ratio" && x.Value == 2);
        Assert.Contains(r.Ratios, x => x.Label == "Net Profit Margin" && x.Value == 0.1);
    }

    [Fact]
    public async Task Score_returns_error_for_headerless_file()
    {
        var client = Substitute.For<IEdfxClient>();
        var svc = new UploadScoreService(client, new HttpClient());
        var r = await svc.ScoreAsync(Encoding.UTF8.GetBytes("only-a-header-row\n"), "x.csv");
        Assert.Equal("error", r.Status);
    }
}
