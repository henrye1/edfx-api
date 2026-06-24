using Edfx.Web.Services;

public class SectionCatalogueTests
{
    [Fact]
    public void Contains_all_fifteen_sections()
    {
        Assert.Equal(15, SectionCatalogue.All.Count);
        Assert.Equal("PD (best estimate)", SectionCatalogue.Title("pds"));
        Assert.Equal("Credit Limit", SectionCatalogue.Title("credit_limit"));
    }

    [Fact]
    public void Title_falls_back_to_key_when_unknown()
    {
        Assert.Equal("unknown_key", SectionCatalogue.Title("unknown_key"));
    }
}
