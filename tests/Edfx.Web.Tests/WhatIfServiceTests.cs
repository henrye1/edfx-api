using System.Text;
using Edfx.ApiClient;
using Edfx.Domain;
using Edfx.Web.Services;
using NSubstitute;
using Xunit;

public class WhatIfServiceTests
{
    [Fact]
    public async Task Compute_applies_overrides_uploads_and_returns_recomputed_pd()
    {
        var client = Substitute.For<IEdfxClient>();
        client.DownloadTemplateAsync("universal")
              .Returns(Encoding.UTF8.GetBytes("entityIdentifierbvd,financialStatementDate,asOfDate,primaryCountry,primaryIndustry,primaryIndustryClassification,currency,entityType,entityInternationalName,netSales,totalAssets\n"));
        client.ExtractAsync("statements", Arg.Any<IEnumerable<string>>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
              .Returns(("{\"entities\":[{\"statements\":[{\"currency\":\"ZAR\",\"financialStatementDate\":\"2025-12-31\",\"incomeStatement\":{\"netSales\":100},\"balanceSheet\":{\"totalAssets\":120}}]}]}", 200));
        client.SearchAsync("ZA1", 1, 0).Returns((
            new EntitySearchResponse { Entities = { new EntitySummary { EntityId = "ZA1", IdentifierBvd = "ZA1", ContactCountryCode = "ZAF", PrimaryIndustryNDY = "N25", EntityType = "Corporate", InternationalName = "Co" } } },
            "{}"));

        byte[]? uploaded = null;
        client.UploadModelInputsAsync(Arg.Do<byte[]>(b => uploaded = b), Arg.Any<string>())
              .Returns(("{\"processId\":\"P1\"}", 200));
        client.ProcessStatusAsync("P1").Returns(("{\"status\":\"Completed\"}", 200));
        client.PostRawAsync("entities/pds", Arg.Any<object>())
              .Returns(("{\"entities\":[{\"pd\":0.0094,\"impliedRating\":\"Ba1\",\"asOfDate\":\"2026-06-01\"}]}", 200));

        var svc = new WhatIfService(client, new HttpClient());
        var result = await svc.ComputeAsync("ZA1", new Dictionary<string, double> { ["netSales"] = 200 });

        Assert.Equal("completed", result.Status);
        Assert.Equal(0.0094, result.Pd);
        Assert.Equal("Ba1", result.ImpliedRating);
        // The uploaded CSV carries the override (200) and the mandatory BvD id.
        var csv = Encoding.UTF8.GetString(uploaded!);
        Assert.Contains("200", csv);
        Assert.Contains("ZA1", csv);
    }

    [Fact]
    public async Task Compute_returns_failed_with_message_when_process_fails()
    {
        var client = Substitute.For<IEdfxClient>();
        client.DownloadTemplateAsync("universal").Returns(Encoding.UTF8.GetBytes("entityIdentifierbvd,netSales\n"));
        client.ExtractAsync("statements", Arg.Any<IEnumerable<string>>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
              .Returns(("{\"entities\":[{\"statements\":[{\"incomeStatement\":{\"netSales\":100}}]}]}", 200));
        client.SearchAsync("ZA1", 1, 0).Returns((new EntitySearchResponse { Entities = { new EntitySummary { EntityId = "ZA1", IdentifierBvd = "ZA1" } } }, "{}"));
        client.UploadModelInputsAsync(Arg.Any<byte[]>(), Arg.Any<string>()).Returns(("{\"processId\":\"P1\"}", 200));
        client.ProcessStatusAsync("P1").Returns(("{\"status\":\"Failed\",\"errorFile\":\"\"}", 200));

        var svc = new WhatIfService(client, new HttpClient());
        var result = await svc.ComputeAsync("ZA1", new Dictionary<string, double>());

        Assert.Equal("failed", result.Status);
        Assert.False(string.IsNullOrEmpty(result.Error));
    }
}
