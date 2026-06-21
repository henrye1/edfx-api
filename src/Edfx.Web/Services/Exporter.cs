using ClosedXML.Excel;
using System.Globalization;
using System.Text;

namespace Edfx.Web.Services;

public static class Exporter
{
    public static byte[] ToCsv(List<Dictionary<string, object?>> rows)
    {
        var sb = new StringBuilder();
        if (rows.Count == 0) return Encoding.UTF8.GetBytes("");
        var cols = rows[0].Keys.ToList();
        sb.AppendLine(string.Join(",", cols));
        foreach (var r in rows)
            sb.AppendLine(string.Join(",", cols.Select(c => Format(r.GetValueOrDefault(c)))));
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public static byte[] ToXlsx(params (string sheet, List<Dictionary<string, object?>> rows)[] sheets)
    {
        using var wb = new XLWorkbook();
        foreach (var (sheet, rows) in sheets)
        {
            var ws = wb.Worksheets.Add(sheet);
            if (rows.Count == 0) continue;
            var cols = rows[0].Keys.ToList();
            for (int i = 0; i < cols.Count; i++) ws.Cell(1, i + 1).Value = cols[i];
            for (int r = 0; r < rows.Count; r++)
                for (int c = 0; c < cols.Count; c++)
                    SetCell(ws.Cell(r + 2, c + 1), rows[r].GetValueOrDefault(cols[c]));
        }
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // Write native Excel types so numbers stay formula-summable in the credit-model spreadsheets.
    private static void SetCell(IXLCell cell, object? v)
    {
        switch (v)
        {
            case null: cell.Value = ""; break;
            case double d: cell.Value = d; break;
            case float f: cell.Value = f; break;
            case decimal m: cell.Value = m; break;
            case int i: cell.Value = i; break;
            case long l: cell.Value = l; break;
            case bool b: cell.Value = b; break;
            case DateTime dt: cell.Value = dt; break;
            default: cell.Value = v.ToString(); break;
        }
    }

    private static string Format(object? v) => v switch
    {
        null => "",
        double d => d.ToString(CultureInfo.InvariantCulture),
        _ => v.ToString()!.Contains(',') ? $"\"{v}\"" : v.ToString()!
    };
}
