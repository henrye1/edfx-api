using Npgsql;
namespace Edfx.Storage;

public record PortfolioCompany(
    string EntityId, string? Name, string? Industry,
    double? Pd, string? ImpliedRating, string? Ews, string? EwsChange,
    double? PeerPercentile, DateTimeOffset AddedAt);

public record PortfolioSummaryRow(
    string PortfolioId, string Name, string? CreatedBy, int CompanyCount,
    int Low, int Medium, int High, int Severe, int NeedData, double? PdMedian);

public class PortfolioRepository
{
    private readonly Db _db;
    public PortfolioRepository(Db db) { _db = db; }

    /// <summary>Creates a portfolio (idempotent: updates the name on conflict).</summary>
    public void CreatePortfolio(string id, string name, string? createdBy)
    {
        using var conn = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            insert into portfolios(portfolio_id, name, created_by) values(@i,@n,@c)
            on conflict(portfolio_id) do update set name=excluded.name;
            """, conn);
        cmd.Parameters.AddWithValue("i", id);
        cmd.Parameters.AddWithValue("n", name);
        cmd.Parameters.AddWithValue("c", (object?)createdBy ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public string? GetPortfolioName(string id)
    {
        using var conn = _db.Open();
        using var cmd = new NpgsqlCommand("select name from portfolios where portfolio_id=@i", conn);
        cmd.Parameters.AddWithValue("i", id);
        return cmd.ExecuteScalar() as string;
    }

    /// <summary>All portfolios with company counts, EWS distribution and median PD.</summary>
    public List<PortfolioSummaryRow> ListPortfolios()
    {
        using var conn = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            select p.portfolio_id, p.name, p.created_by,
                   count(c.entity_id) as company_count,
                   count(*) filter (where c.ews='Low')    as low,
                   count(*) filter (where c.ews='Medium')  as medium,
                   count(*) filter (where c.ews='High')    as high,
                   count(*) filter (where c.ews='Severe')  as severe,
                   count(*) filter (where c.entity_id is not null and (c.ews is null or c.ews not in ('Low','Medium','High','Severe'))) as needdata,
                   percentile_cont(0.5) within group (order by c.pd) as pd_median
            from portfolios p
            left join portfolio_companies c on c.portfolio_id = p.portfolio_id
            group by p.portfolio_id, p.name, p.created_by, p.created_at
            order by p.created_at desc;
            """, conn);
        var list = new List<PortfolioSummaryRow>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
            list.Add(new PortfolioSummaryRow(
                rd.GetString(0), rd.GetString(1), rd.IsDBNull(2) ? null : rd.GetString(2),
                (int)rd.GetInt64(3), (int)rd.GetInt64(4), (int)rd.GetInt64(5), (int)rd.GetInt64(6),
                (int)rd.GetInt64(7), (int)rd.GetInt64(8), rd.IsDBNull(9) ? null : rd.GetDouble(9)));
        return list;
    }

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

    /// <summary>Deletes a portfolio and all of its company memberships.</summary>
    public void DeletePortfolio(string portfolioId)
    {
        using var conn = _db.Open();
        using var cmd = new NpgsqlCommand(
            "delete from portfolio_companies where portfolio_id=@p; delete from portfolios where portfolio_id=@p;", conn);
        cmd.Parameters.AddWithValue("p", portfolioId);
        cmd.ExecuteNonQuery();
    }
}
