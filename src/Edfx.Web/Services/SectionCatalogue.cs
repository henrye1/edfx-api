namespace Edfx.Web.Services;

/// <summary>The canonical EDF-X extraction sections (key + display title), in report order.</summary>
public static class SectionCatalogue
{
    public record Section(string Key, string Title);

    public static readonly IReadOnlyList<Section> All = new List<Section>
    {
        new("pds","PD (best estimate)"), new("pds_creditedge","PD — CreditEdge"),
        new("pds_riskcalc","PD — RiskCalc"), new("pds_payment","PD — Payment"),
        new("statements","Financial Statements"), new("ratios","Financial Ratios"),
        new("ratios_calculate","Ratios (calculated)"),
        new("peers_id","Peer Group IDs"), new("peers_metrics","Peer Metrics"),
        new("peers_percentile","Peer Percentile"), new("peers_metadata","Peer Metadata"),
        new("peers_recommended","Recommended Peers"),
        new("risk_category","Early Warning — Risk Category"), new("triggers","Early Warning — Triggers"),
        new("credit_limit","Credit Limit"),
    };

    public static string Title(string key)
        => All.FirstOrDefault(s => s.Key == key)?.Title ?? key;
}
