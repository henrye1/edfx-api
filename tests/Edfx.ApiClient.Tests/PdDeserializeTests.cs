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
