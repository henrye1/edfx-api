using Npgsql;
namespace Edfx.Storage;
public record ExtractionRow(Guid Id, int Version);
public record HistoryItem(int Version, DateTimeOffset RequestedAt, int HttpStatus, string Status);

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
        using var cmd = new NpgsqlCommand(
            """
            insert into extractions(entity_id,section,version,request_params,http_status,status,raw_json)
            values(@e,@s,
               (select coalesce(max(version),0)+1 from extractions where entity_id=@e and section=@s),
               @p::jsonb,@h,@st,@r::jsonb)
            returning id, version;
            """, c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("s", section);
        cmd.Parameters.AddWithValue("p", requestParams);
        cmd.Parameters.AddWithValue("h", httpStatus);
        cmd.Parameters.AddWithValue("st", status);
        cmd.Parameters.AddWithValue("r", rawJson);
        using var rd = cmd.ExecuteReader(); rd.Read();
        return new ExtractionRow(rd.GetGuid(0), rd.GetInt32(1));
    }

    public string? LatestRaw(string entityId, string section)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            "select raw_json::text from extractions where entity_id=@e and section=@s order by version desc limit 1", c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("s", section);
        return cmd.ExecuteScalar() as string;
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
            "select raw_json::text from extractions where entity_id=@e and section=@s and version=@v", c);
        cmd.Parameters.AddWithValue("e", entityId); cmd.Parameters.AddWithValue("s", section);
        cmd.Parameters.AddWithValue("v", version);
        return cmd.ExecuteScalar() as string;
    }
}
