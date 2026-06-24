using Edfx.Web.Services;

public class JsonFlattenerTests
{
    [Fact]
    public void Flattens_entities_array_wrapper()
    {
        var rows = JsonFlattener.Flatten("{\"entities\":[{\"pd\":0.01,\"rating\":\"Ba1\"}]}");
        Assert.Single(rows);
        Assert.Equal("0.01", rows[0]["pd"]);
        Assert.Equal("Ba1", rows[0]["rating"]);
    }

    [Fact]
    public void Flattens_bare_top_level_array()
    {
        var rows = JsonFlattener.Flatten("[{\"a\":1},{\"a\":2}]");
        Assert.Equal(2, rows.Count);
    }

    [Fact]
    public void Flattens_single_object_and_skips_nested()
    {
        var rows = JsonFlattener.Flatten("{\"a\":1,\"nested\":{\"b\":2}}");
        Assert.Single(rows);
        Assert.True(rows[0].ContainsKey("a"));
        Assert.False(rows[0].ContainsKey("nested"));
    }
}
