using Edfx.ApiClient; using Xunit;
public class MockClientTests
{
    [Fact]
    public async Task Mock_returns_canned_search_and_sections()
    {
        IEdfxClient sut = new MockEdfxClient();
        var (s, _) = await sut.SearchAsync("Apple");
        Assert.NotEmpty(s.Entities);
        var (raw, status) = await sut.ExtractAsync("pds", new[] { "US942404110" });
        Assert.Equal(200, status);
        Assert.Contains("pd", raw);
    }
}
