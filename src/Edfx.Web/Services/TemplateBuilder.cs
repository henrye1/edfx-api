using ClosedXML.Excel;

namespace Edfx.Web.Services;

/// <summary>Builds an annotated Excel version of the EDF-X corporate input template:
/// mandatory fields highlighted, an example row, and a Field Guide sheet.</summary>
public static class TemplateBuilder
{
    private static readonly HashSet<string> Mandatory = new(StringComparer.OrdinalIgnoreCase)
    { "entityIdentifierbvd", "primaryIndustryClassification", "primaryIndustry", "primaryCountry" };

    private static readonly HashSet<string> Conditional = new(StringComparer.OrdinalIgnoreCase)
    { "financialStatementDate", "currency" };

    private static readonly HashSet<string> Recommended = new(StringComparer.OrdinalIgnoreCase)
    { "totalAssets", "totalLiabilities", "entityType", "entityInternationalName", "asOfDate", "primaryStateProvince" };

    // Realistic sample values for a fictional ZAR-reporting corporate.
    private static readonly Dictionary<string, object> Example = new(StringComparer.OrdinalIgnoreCase)
    {
        ["entityInternationalName"] = "Example Corporate Ltd",
        ["entityIdentifierbvd"] = "EXAMPLE-0001",
        ["financialStatementDate"] = "2025-12-31",
        ["asOfDate"] = "2026-06-01",
        ["primaryIndustryClassification"] = "NDY",
        ["primaryIndustry"] = "N16",
        ["primaryCountry"] = "ZAF",
        ["currency"] = "ZAR",
        ["entityType"] = "Corporate",
        ["cashAndMarketableSecurities"] = 600000,
        ["totalAccountsReceivable"] = 2000000,
        ["totalInventory"] = 1500000,
        ["totalCurrentAssets"] = 5300000,
        ["totalFixedAssets"] = 4000000,
        ["totalAssets"] = 12000000,
        ["totalCurrentLiabilities"] = 3900000,
        ["totalLongTermDebt"] = 2500000,
        ["totalNonCurrentLiabilities"] = 4100000,
        ["totalLiabilities"] = 8000000,
        ["netWorth"] = 4000000,
        ["retainedEarnings"] = 2500000,
        ["netSales"] = 15000000,
        ["totalCostOfGoodsSold"] = 11000000,
        ["grossIncome"] = 4000000,
        ["totalOperatingProfit"] = 1300000,
        ["financeCosts"] = 350000,
        ["netIncome"] = 700000,
        ["ebitda"] = 1600000,
        ["numberOfEmployees"] = 1200,
    };

    public static byte[] AnnotatedXlsx(string[] cols)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Template");

        var orange = XLColor.FromHtml("#F4C7A3");
        var yellow = XLColor.FromHtml("#FCE4A6");
        var blue = XLColor.FromHtml("#CFE2F3");

        for (var i = 0; i < cols.Length; i++)
        {
            var col = cols[i].Trim();
            var head = ws.Cell(1, i + 1);
            head.Value = col;               // exact column name — keep unchanged for upload validity
            head.Style.Font.Bold = true;
            head.Style.Alignment.TextRotation = 90;
            if (Mandatory.Contains(col)) { head.Style.Fill.BackgroundColor = orange; head.CreateComment().AddText("MANDATORY"); }
            else if (Conditional.Contains(col)) { head.Style.Fill.BackgroundColor = yellow; head.CreateComment().AddText("Required if Total Assets / Total Liabilities are provided"); }
            else if (Recommended.Contains(col)) head.Style.Fill.BackgroundColor = blue;

            if (Example.TryGetValue(col, out var v)) ws.Cell(2, i + 1).Value = XLCellValue.FromObject(v);
        }
        ws.Row(1).Height = 110;
        ws.SheetView.FreezeRows(1);
        ws.Columns().Width = 16;

        // Field guide sheet
        var g = wb.Worksheets.Add("Field Guide");
        g.Cell(1, 1).Value = "Field"; g.Cell(1, 2).Value = "Requirement"; g.Cell(1, 3).Value = "Notes / Example";
        g.Row(1).Style.Font.Bold = true;
        var guide = new (string field, string req, string note)[]
        {
            ("entityIdentifierbvd", "MANDATORY", "Unique id for the entity, e.g. BvD ID or any unique key (e.g. EXAMPLE-0001)."),
            ("primaryIndustryClassification", "MANDATORY", "One of NDY, NACE2, NAICS2017."),
            ("primaryIndustry", "MANDATORY", "A valid code within the chosen classification, e.g. NDY 'N16'."),
            ("primaryCountry", "MANDATORY", "ISO 3-letter country code, e.g. ZAF, USA, GBR."),
            ("financialStatementDate", "Required if financials provided", "YYYY-MM-DD closing date of the statement."),
            ("currency", "Required if financials provided", "ISO 4217 code, e.g. ZAR. All amounts in this currency."),
            ("totalAssets", "Recommended", "Improves accuracy (size)."),
            ("totalLiabilities", "Recommended", "Improves accuracy (leverage)."),
            ("entityType", "Recommended", "e.g. Corporate."),
            ("primaryStateProvince", "Recommended (US only)", "ISO 3166 subdivision without country prefix, e.g. CA."),
            ("(all other columns)", "Optional", "More financial line items = a more accurate PD. Leave blank if unknown — but keep every column."),
        };
        for (var r = 0; r < guide.Length; r++)
        {
            g.Cell(r + 2, 1).Value = guide[r].field;
            g.Cell(r + 2, 2).Value = guide[r].req;
            g.Cell(r + 2, 3).Value = guide[r].note;
        }
        g.Cell(guide.Length + 3, 1).Value = "Legend:";
        g.Cell(guide.Length + 3, 1).Style.Font.Bold = true;
        g.Cell(guide.Length + 4, 1).Value = "Mandatory"; g.Cell(guide.Length + 4, 1).Style.Fill.BackgroundColor = orange;
        g.Cell(guide.Length + 5, 1).Value = "Required if financials given"; g.Cell(guide.Length + 5, 1).Style.Fill.BackgroundColor = yellow;
        g.Cell(guide.Length + 6, 1).Value = "Recommended"; g.Cell(guide.Length + 6, 1).Style.Fill.BackgroundColor = blue;
        g.Cell(guide.Length + 8, 1).Value = "Row 2 of the Template sheet is a worked example — replace it with your data (keep all columns).";
        g.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
