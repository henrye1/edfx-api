using Edfx.ApiClient;
using Edfx.Domain;
using Edfx.Web.Controllers;
using NSubstitute;
using Xunit;

public class SearchControllerTests
{
    [Fact]
    public async Task Search_returns_entities_from_client()
    {
        var client = Substitute.For<IEdfxClient>();
        var resp = new EntitySearchResponse
        {
            Total = 1,
            Entities = { new EntitySummary { EntityId = "ZA194602118006", InternationalName = "The Bidvest Group Ltd" } },
        };
        client.SearchAsync("Bidvest", 20, 0).Returns((resp, "{}"));
        var sut = new SearchController(client);

        var result = await sut.Search("Bidvest");

        Assert.Equal(resp, result.Value);
        Assert.Single(result.Value!.Entities);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("a")]
    public async Task Search_returns_empty_for_too_short_query_without_calling_client(string query)
    {
        var client = Substitute.For<IEdfxClient>();
        var sut = new SearchController(client);

        var result = await sut.Search(query);

        Assert.Empty(result.Value!.Entities);
        await client.DidNotReceive().SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<int>());
    }

    [Fact]
    public async Task Summary_aggregates_pd_rating_and_early_warning()
    {
        var client = Substitute.For<IEdfxClient>();
        client.SearchAsync("ZA1", 1, 0).Returns((
            new EntitySearchResponse { Entities = { new EntitySummary { EntityId = "ZA1", InternationalName = "The Bidvest Group Ltd" } } },
            "{}"));
        client.ExtractAsync("pds", Arg.Any<IEnumerable<string>>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
              .Returns(("{\"entities\":[{\"pd\":0.0019,\"impliedRating\":\"A3\",\"asOfDate\":\"2026-06-21\"," +
                        "\"history\":[{\"asOfDate\":\"2026-05-31\",\"pd\":0.0018,\"impliedRating\":\"A3\"}," +
                        "{\"asOfDate\":\"2026-06-21\",\"pd\":0.0019,\"impliedRating\":\"A3\"}]}]}", 200));
        client.ExtractAsync("risk_category", Arg.Any<IEnumerable<string>>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
              .Returns(("{\"entities\":[{\"riskCategory\":\"Medium\",\"irChange\":-2,\"trigger\":0.026}]}", 200));
        var sut = new SearchController(client);

        var dto = (await sut.Summary("ZA1")).Value!;

        Assert.Equal("The Bidvest Group Ltd", dto.Name);
        Assert.Equal(0.0019, dto.Pd);
        Assert.Equal("A3", dto.ImpliedRating);
        Assert.Equal("Medium", dto.Ews);
        Assert.Equal("Deteriorated", dto.EwsChange); // irChange < 0
        Assert.Equal(0.026, dto.Trigger);
        Assert.Equal(2, dto.PdHistory.Count);
        Assert.Equal(0.0018, dto.PdHistory[0].Pd);
    }

    [Fact]
    public async Task Profile_returns_first_search_hit()
    {
        var client = Substitute.For<IEdfxClient>();
        client.SearchAsync("ZA1", 1, 0).Returns((
            new EntitySearchResponse { Entities = { new EntitySummary { EntityId = "ZA1", InternationalName = "Sasol Ltd", CountryName = "South Africa", Ticker = "SOL" } } },
            "{}"));
        var sut = new SearchController(client);

        var dto = (await sut.Profile("ZA1")).Value!;

        Assert.Equal("Sasol Ltd", dto.InternationalName);
        Assert.Equal("SOL", dto.Ticker);
    }

    [Fact]
    public async Task Financials_returns_latest_statement_and_ratios()
    {
        var client = Substitute.For<IEdfxClient>();
        client.ExtractAsync("statements", Arg.Any<IEnumerable<string>>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
              .Returns(("{\"entities\":[{\"statements\":[{\"currency\":\"ZAR\",\"balanceSheet\":{\"totalCurrentAssets\":100}}]}]}", 200));
        client.ExtractAsync("ratios", Arg.Any<IEnumerable<string>>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
              .Returns(("{\"entities\":[{\"ratios\":[{\"leverage\":{\"ratioTotalDebtToTotalAssets\":0.36}}]}]}", 200));
        var sut = new SearchController(client);

        var dto = (await sut.Financials("ZA1")).Value!;

        Assert.NotNull(dto.Statement);
        Assert.Equal("ZAR", dto.Statement!.Value.GetProperty("currency").GetString());
        Assert.NotNull(dto.Ratios);
        Assert.True(dto.Ratios!.Value.GetProperty("leverage").GetProperty("ratioTotalDebtToTotalAssets").GetDouble() > 0);
    }
}
