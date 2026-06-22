using Npgsql;
namespace Edfx.Storage;

public record PortfolioCompany(
    string EntityId, string? Name, string? Industry,
    double? Pd, string? ImpliedRating, string? Ews, string? EwsChange,
    double? PeerPercentile, DateTimeOffset AddedAt);

public class PortfolioRepository
{
    private readonly Db _db;
    public PortfolioRepository(Db db) { _db = db; }

    /// <summary>Adds (or updates) a company in a portfolio with a snapshot of its loaded data.</summary>
    public void AddCompany(string portfolioId, PortfolioCompany c)
    {
        using var conn = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            insert into portfolio_companies
              (portfolio_id, entity_id, name, industry, pd, implied_rating, ews, ews_change, peer_percentile)
            values (@p,@e,@n,@i,@pd,@r,@ews,@ec,@pp)
            on conflict (portfolio_id, entity_id) do update set
              name=excluded.name, industry=excluded.industry, pd=excluded.pd,
              implied_rating=excluded.implied_rating, ews=excluded.ews,
              ews_change=excluded.ews_change, peer_percentile=excluded.peer_percentile,
              added_at=now();
            """, conn);
        cmd.Parameters.AddWithValue("p", portfolioId);
        cmd.Parameters.AddWithValue("e", c.EntityId);
        cmd.Parameters.AddWithValue("n", (object?)c.Name ?? DBNull.Value);
        cmd.Parameters.AddWithValue("i", (object?)c.Industry ?? DBNull.Value);
        cmd.Parameters.AddWithValue("pd", (object?)c.Pd ?? DBNull.Value);
        cmd.Parameters.AddWithValue("r", (object?)c.ImpliedRating ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ews", (object?)c.Ews ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ec", (object?)c.EwsChange ?? DBNull.Value);
        cmd.Parameters.AddWithValue("pp", (object?)c.PeerPercentile ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    /// <summary>Lists the persisted companies for a portfolio, newest first.</summary>
    public List<PortfolioCompany> Companies(string portfolioId)
    {
        using var conn = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            select entity_id, name, industry, pd, implied_rating, ews, ews_change, peer_percentile, added_at
            from portfolio_companies where portfolio_id=@p order by added_at desc;
            """, conn);
        cmd.Parameters.AddWithValue("p", portfolioId);
        var list = new List<PortfolioCompany>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
            list.Add(new PortfolioCompany(
                rd.GetString(0),
                rd.IsDBNull(1) ? null : rd.GetString(1),
                rd.IsDBNull(2) ? null : rd.GetString(2),
                rd.IsDBNull(3) ? null : rd.GetDouble(3),
                rd.IsDBNull(4) ? null : rd.GetString(4),
                rd.IsDBNull(5) ? null : rd.GetString(5),
                rd.IsDBNull(6) ? null : rd.GetString(6),
                rd.IsDBNull(7) ? null : rd.GetDouble(7),
                rd.GetFieldValue<DateTimeOffset>(8)));
        return list;
    }

    public void RemoveCompany(string portfolioId, string entityId)
    {
        using var conn = _db.Open();
        using var cmd = new NpgsqlCommand(
            "delete from portfolio_companies where portfolio_id=@p and entity_id=@e", conn);
        cmd.Parameters.AddWithValue("p", portfolioId);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.ExecuteNonQuery();
    }
}
