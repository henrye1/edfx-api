using Npgsql;
namespace Edfx.Storage;
public record ExtractionRow(Guid Id, int Version);
public record HistoryItem(int Version, DateTimeOffset RequestedAt, int HttpStatus, string Status);
public record LatestExtraction(int Version, int HttpStatus, string Status, string Raw);
public record RecentExtraction(
    string EntityId, string? Name, string Section, int Version,
    DateTimeOffset RequestedAt, int HttpStatus, string Status);
public record EntityResults(string EntityId, string? Name, int SectionCount, DateTimeOffset LastExtractedAt);
public record SectionResult(string Section, int Version, int HttpStatus, string Status, string Raw);

public class ExtractionRepository
{
    private readonly Db _db;
    public ExtractionRepository(Db db) { _db = db; }

    public void UpsertEntity(string entityId, string? name, string? country)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            insert into entities(entity_id,name,country) values(@id,@n,@c)
            on conflict(entity_id) do update set name=excluded.name,
              country=excluded.country, last_seen_at=now();
            """, c);
        cmd.Parameters.AddWithValue("id", entityId);
        cmd.Parameters.AddWithValue("n", (object?)name ?? DBNull.Value);
        cmd.Parameters.AddWithValue("c", (object?)country ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public ExtractionRow SaveExtraction(string entityId, string section, string rawJson,
        int httpStatus, string status, string requestParams)
    {
        using var c = _db.Open();

        // Fix 1: guarantee FK parent row exists regardless of whether UpsertEntity was called
        using var ensure = new NpgsqlCommand(
            "insert into entities(entity_id) values(@e) on conflict(entity_id) do nothing", c);
        ensure.Parameters.AddWithValue("e", entityId);
        ensure.ExecuteNonQuery();

        // Fix 2: only cast to jsonb when the body is actually valid JSON;
        // store NULL for raw_json on bad bodies and record error_detail
        bool isJson = true;
        try { using var _ = System.Text.Json.JsonDocument.Parse(rawJson); }
        catch { isJson = false; }

        using var cmd = new NpgsqlCommand(
            """
            insert into extractions(entity_id,section,version,request_params,http_status,status,raw_json,raw_text,error_detail)
            values(@e,@s,
               (select coalesce(max(version),0)+1 from extractions where entity_id=@e and section=@s),
               @p::jsonb,@h,@st,@r::jsonb,@rt,@ed)
            returning id, version;
            """, c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("s", section);
        cmd.Parameters.AddWithValue("p", requestParams);
        cmd.Parameters.AddWithValue("h", httpStatus);
        cmd.Parameters.AddWithValue("st", status);
        cmd.Parameters.AddWithValue("r", isJson ? (object)rawJson : DBNull.Value);
        cmd.Parameters.AddWithValue("rt", rawJson);
        cmd.Parameters.AddWithValue("ed", isJson ? (object)DBNull.Value : "non-JSON response body");
        using var rd = cmd.ExecuteReader(); rd.Read();
        return new ExtractionRow(rd.GetGuid(0), rd.GetInt32(1));
    }

    public string? LatestRaw(string entityId, string section)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            "select raw_text from extractions where entity_id=@e and section=@s order by version desc limit 1", c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("s", section);
        return cmd.ExecuteScalar() as string;
    }

    /// <summary>Latest saved extraction (with version + status) for one entity/section, or null if none.</summary>
    public LatestExtraction? Latest(string entityId, string section)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            "select version, http_status, status, raw_text from extractions where entity_id=@e and section=@s order by version desc limit 1", c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("s", section);
        using var rd = cmd.ExecuteReader();
        if (!rd.Read()) return null;
        return new LatestExtraction(
            rd.GetInt32(0),
            rd.IsDBNull(1) ? 0 : rd.GetInt32(1),
            rd.GetString(2),
            rd.IsDBNull(3) ? "" : rd.GetString(3));
    }

    /// <summary>Most-recent extractions across all entities and sections, newest first.</summary>
    public List<RecentExtraction> Recent(int limit = 500)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            select x.entity_id, e.name, x.section, x.version, x.requested_at, x.http_status, x.status
            from extractions x
            left join entities e on e.entity_id = x.entity_id
            order by x.requested_at desc
            limit @lim;
            """, c);
        cmd.Parameters.AddWithValue("lim", limit);
        var list = new List<RecentExtraction>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
            list.Add(new RecentExtraction(
                rd.IsDBNull(0) ? "" : rd.GetString(0),
                rd.IsDBNull(1) ? null : rd.GetString(1),
                rd.GetString(2),
                rd.GetInt32(3),
                rd.GetFieldValue<DateTimeOffset>(4),
                rd.IsDBNull(5) ? 0 : rd.GetInt32(5),
                rd.GetString(6)));
        return list;
    }

    /// <summary>All entities that have at least one extraction, newest activity first.</summary>
    public List<EntityResults> EntitiesWithExtractions()
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            select x.entity_id, max(e.name) as name,
                   count(distinct x.section) as section_count,
                   max(x.requested_at) as last_at
            from extractions x
            left join entities e on e.entity_id = x.entity_id
            group by x.entity_id
            order by last_at desc;
            """, c);
        var list = new List<EntityResults>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
            list.Add(new EntityResults(
                rd.GetString(0),
                rd.IsDBNull(1) ? null : rd.GetString(1),
                (int)rd.GetInt64(2),
                rd.GetFieldValue<DateTimeOffset>(3)));
        return list;
    }

    /// <summary>The latest saved version of every section for one entity.</summary>
    public List<SectionResult> LatestPerSection(string entityId)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            select distinct on (section) section, version, http_status, status, raw_text
            from extractions
            where entity_id = @e
            order by section, version desc;
            """, c);
        cmd.Parameters.AddWithValue("e", entityId);
        var list = new List<SectionResult>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read())
            list.Add(new SectionResult(
                rd.GetString(0),
                rd.GetInt32(1),
                rd.IsDBNull(2) ? 0 : rd.GetInt32(2),
                rd.GetString(3),
                rd.IsDBNull(4) ? "" : rd.GetString(4)));
        return list;
    }

    public List<HistoryItem> History(string entityId, string section)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            "select version, requested_at, http_status, status from extractions where entity_id=@e and section=@s order by version desc", c);
        cmd.Parameters.AddWithValue("e", entityId); cmd.Parameters.AddWithValue("s", section);
        var list = new List<HistoryItem>(); using var rd = cmd.ExecuteReader();
        while (rd.Read()) list.Add(new HistoryItem(rd.GetInt32(0),
            rd.GetFieldValue<DateTimeOffset>(1), rd.GetInt32(2), rd.GetString(3)));
        return list;
    }

    public string? RawAtVersion(string entityId, string section, int version)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            "select raw_text from extractions where entity_id=@e and section=@s and version=@v", c);
        cmd.Parameters.AddWithValue("e", entityId); cmd.Parameters.AddWithValue("s", section);
        cmd.Parameters.AddWithValue("v", version);
        return cmd.ExecuteScalar() as string;
    }
}
