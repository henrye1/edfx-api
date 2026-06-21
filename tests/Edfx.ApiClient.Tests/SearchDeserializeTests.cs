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
