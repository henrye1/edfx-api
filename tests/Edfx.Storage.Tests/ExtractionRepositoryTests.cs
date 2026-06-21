using Edfx.Storage; using Xunit;
public class ExtractionRepositoryTests : IClassFixture<DbFixture>
{
    private readonly DbFixture _f;
    public ExtractionRepositoryTests(DbFixture f) { _f = f; if (_f.Available) _f.ApplyMigrations(); }

    [SkippableFact]
    public void Save_increments_version_per_entity_section()
    {
        var repo = new ExtractionRepository(new Db(_f.Conn!));
        repo.UpsertEntity("E1", "ACME", "US");
        var v1 = repo.SaveExtraction("E1", "pds", "{\"pd\":0.01}", 200, "ok", "{}");
        var v2 = repo.SaveExtraction("E1", "pds", "{\"pd\":0.02}", 200, "ok", "{}");
        Assert.Equal(1, v1.Version);
        Assert.Equal(2, v2.Version);
        // raw_text stores the verbatim input — byte-exact, no normalisation
        Assert.Equal("{\"pd\":0.02}", repo.LatestRaw("E1", "pds"));
    }

    [SkippableFact]
    public void Lists_versions_and_returns_specific_version_raw()
    {
        var repo = new ExtractionRepository(new Db(_f.Conn!));
        repo.UpsertEntity("E2","X","US");
        repo.SaveExtraction("E2","ratios","{\"a\":1}",200,"ok","{}");
        repo.SaveExtraction("E2","ratios","{\"a\":2}",200,"ok","{}");
        var hist = repo.History("E2","ratios");
        Assert.Equal(2, hist.Count);
        // raw_text stores the verbatim input — byte-exact, no normalisation
        Assert.Equal("{\"a\":1}", repo.RawAtVersion("E2","ratios",1));
    }
}
