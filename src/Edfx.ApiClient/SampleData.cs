namespace Edfx.ApiClient;
public static class SampleData
{
    public const string Search = """{"entities":[{"entityId":"US942404110","internationalName":"APPLE, INC.","countryName":"United States of America","ticker":"AAPL","hasFinancials":"Yes"}],"total":1}""";
    public const string Pd = """{"entities":[{"entityId":"US942404110","asOfDate":"2026-06-01","pd":0.00289,"impliedRating":"Aa1","confidence":"PF-G-S"}]}""";
    public static string ForSection(string section) => section.StartsWith("pds") ? Pd : "{}";
    public static string ForPath(string path) => path.Contains("search") ? Search : "{}";
}
