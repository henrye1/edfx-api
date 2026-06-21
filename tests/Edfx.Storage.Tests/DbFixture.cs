using Npgsql; using Xunit;
public class DbFixture
{
    public string? Conn => Environment.GetEnvironmentVariable("EDFX_TEST_DB");
    public bool Available => !string.IsNullOrEmpty(Conn);
    public void ApplyMigrations()
    {
        // Walk up from the test binary's working dir to find the migrations folder
        // Test runs from: tests/Edfx.Storage.Tests/bin/Debug/net10.0/
        // 5 levels up: net10.0 -> Debug -> bin -> Edfx.Storage.Tests -> tests -> repo root
        var baseDir = AppContext.BaseDirectory;
        var dir = new DirectoryInfo(baseDir);
        // Walk up until we find the migrations folder
        while (dir != null && !Directory.Exists(Path.Combine(dir.FullName, "migrations")))
            dir = dir.Parent;
        if (dir == null) throw new DirectoryNotFoundException("Could not locate migrations folder");
        var migrationsPath = Path.Combine(dir.FullName, "migrations");

        using var c = new NpgsqlConnection(Conn); c.Open();
        // Apply schema migrations (idempotent via IF NOT EXISTS)
        foreach (var f in Directory.GetFiles(migrationsPath).OrderBy(x => x))
            using (var cmd = new NpgsqlCommand(File.ReadAllText(f), c)) cmd.ExecuteNonQuery();
        // Truncate data tables so tests start from a clean state each run
        using (var cmd = new NpgsqlCommand(
            "truncate table pd_values, financial_ratios, peer_metrics, early_warning, credit_limits, extractions, entities restart identity cascade", c))
            cmd.ExecuteNonQuery();
    }
}
public class SkippableFact : FactAttribute
{
    public SkippableFact() { if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("EDFX_TEST_DB"))) Skip = "EDFX_TEST_DB not set"; }
}
