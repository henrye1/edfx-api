using Edfx.Web.Services;
using System.Text;
using Xunit;

public class ExporterTests
{
    [Fact]
    public void Csv_has_header_and_rows()
    {
        var rows = new List<Dictionary<string, object?>>
        { new() { ["metric"] = "pd", ["value"] = 0.01 } };
        var csv = Encoding.UTF8.GetString(Exporter.ToCsv(rows));
        Assert.Contains("metric,value", csv);
        Assert.Contains("pd,0.01", csv);
    }

    [Fact]
    public void Xlsx_is_nonempty()
    {
        var rows = new List<Dictionary<string, object?>> { new() { ["a"] = 1 } };
        Assert.True(Exporter.ToXlsx(("Sheet1", rows)).Length > 0);
    }
}
