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
}
