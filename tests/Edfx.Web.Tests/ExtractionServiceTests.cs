using Edfx.ApiClient;
using Edfx.Web.Services;
using NSubstitute;
using Xunit;

public class ExtractionServiceTests
{
    [Fact]
    public async Task Extract_calls_client_and_saves_raw()
    {
        var client = Substitute.For<IEdfxClient>();
        client.ExtractAsync("pds", Arg.Any<IEnumerable<string>>(), null, null, null)
              .Returns(("{\"entities\":[{\"pd\":0.01}]}", 200));
        var saver = Substitute.For<IExtractionSaver>();
        saver.Save("E1", "pds", "{\"entities\":[{\"pd\":0.01}]}", 200, "ok").Returns(7);
        var sut = new ExtractionService(client, saver);

        var result = await sut.ExtractAndSaveAsync("E1", "pds");
        Assert.Equal(200, result.HttpStatus);
        Assert.Equal(7, result.Version);
        await client.Received().ExtractAsync("pds", Arg.Any<IEnumerable<string>>(), null, null, null);
        saver.Received().Save("E1", "pds", Arg.Any<string>(), 200, "ok");
    }
}
