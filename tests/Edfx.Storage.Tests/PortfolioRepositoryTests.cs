using Edfx.Storage;
using Xunit;

public class PortfolioRepositoryTests
{
    private readonly DbFixture _fx = new();

    [SkippableFact]
    public void Add_then_list_returns_the_persisted_company_snapshot()
    {
        _fx.ApplyMigrations();
        var repo = new PortfolioRepository(new Db(_fx.Conn!));

        repo.AddCompany("hsbc", new PortfolioCompany(
            "ZA197900323106", "Sasol Ltd", "OIL, GAS & COAL", 0.0102, "Ba1", "Low", "Improved", null, default));

        var rows = repo.Companies("hsbc");
        Assert.Single(rows);
        Assert.Equal("Sasol Ltd", rows[0].Name);
        Assert.Equal(0.0102, rows[0].Pd);
        Assert.Equal("Ba1", rows[0].ImpliedRating);
        Assert.Equal("Low", rows[0].Ews);
    }

    [SkippableFact]
    public void Add_is_idempotent_and_updates_snapshot_on_conflict()
    {
        _fx.ApplyMigrations();
        var repo = new PortfolioRepository(new Db(_fx.Conn!));

        repo.AddCompany("p1", new PortfolioCompany("E1", "Co", "IND", 0.01, "Ba1", "Low", "No Change", null, default));
        repo.AddCompany("p1", new PortfolioCompany("E1", "Co", "IND", 0.02, "Ba2", "Medium", "Deteriorated", null, default));

        var rows = repo.Companies("p1");
        Assert.Single(rows);
        Assert.Equal(0.02, rows[0].Pd);
        Assert.Equal("Medium", rows[0].Ews);
    }

    [SkippableFact]
    public void Remove_deletes_the_membership()
    {
        _fx.ApplyMigrations();
        var repo = new PortfolioRepository(new Db(_fx.Conn!));
        repo.AddCompany("p2", new PortfolioCompany("E9", "Co", null, null, null, null, null, null, default));
        repo.RemoveCompany("p2", "E9");
        Assert.Empty(repo.Companies("p2"));
    }
}
