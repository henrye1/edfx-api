using Npgsql;
namespace Edfx.Storage;
public class Db
{
    private readonly string _conn;
    public Db(string conn) { _conn = conn; }
    public NpgsqlConnection Open()
    {
        var c = new NpgsqlConnection(_conn); c.Open(); return c;
    }
}
