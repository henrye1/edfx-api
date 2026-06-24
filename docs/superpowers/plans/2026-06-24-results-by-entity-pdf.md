# Results-by-entity UI + Consolidated PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users browse extracted EDF-X results by entity name, view all of an entity's sections on one page, and download a single consolidated PDF of those results.

**Architecture:** All changes live in the Blazor app (`Edfx.Web`) and `Edfx.Storage`. New read methods on `ExtractionRepository` feed a Results hub (`/results`) and detail page (`/results/{id}`). A shared `JsonFlattener` and `SectionCatalogue` are extracted to avoid duplication. `PdfReportBuilder` (QuestPDF) renders a cover page + one table per section; entity names are resolved from the EDF-X search endpoint, stored on extract, and backfilled for existing rows.

**Tech Stack:** C# / .NET 10, Blazor Server (InteractiveServer), Npgsql/Postgres (Supabase), ClosedXML, QuestPDF, xUnit + NSubstitute.

## Global Constraints

- Target framework: `net10.0`; `Nullable` enabled; `ImplicitUsings` enabled.
- PDF library: QuestPDF, Community license (set via static constructor so app + tests both work). Assumes company annual revenue < $1M USD.
- DB-dependent repository tests use `[SkippableFact]` + `DbFixture` (skipped unless `EDFX_TEST_DB` is set). Never require a live DB for pure-logic tests.
- Section order and titles come from one source: `SectionCatalogue.All` (15 sections).
- Defensive style: repository/controller reads catch exceptions and degrade to empty/404, matching existing code.
- Git on this repo needs `git config windows.appendAtomically false` (already set) to commit.
- Commit message footer line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: Extract `JsonFlattener` (shared JSON→rows helper)

**Files:**
- Create: `src/Edfx.Web/Services/JsonFlattener.cs`
- Modify: `src/Edfx.Web/Controllers/ExportController.cs` (replace private `Flatten`, call shared helper)
- Test: `tests/Edfx.Web.Tests/JsonFlattenerTests.cs`

**Interfaces:**
- Produces: `Edfx.Web.Services.JsonFlattener.Flatten(string raw) -> List<Dictionary<string, object?>>`

- [ ] **Step 1: Write the failing test**

```csharp
// tests/Edfx.Web.Tests/JsonFlattenerTests.cs
using Edfx.Web.Services;

public class JsonFlattenerTests
{
    [Fact]
    public void Flattens_entities_array_wrapper()
    {
        var rows = JsonFlattener.Flatten("{\"entities\":[{\"pd\":0.01,\"rating\":\"Ba1\"}]}");
        Assert.Single(rows);
        Assert.Equal("0.01", rows[0]["pd"]);
        Assert.Equal("Ba1", rows[0]["rating"]);
    }

    [Fact]
    public void Flattens_bare_top_level_array()
    {
        var rows = JsonFlattener.Flatten("[{\"a\":1},{\"a\":2}]");
        Assert.Equal(2, rows.Count);
    }

    [Fact]
    public void Flattens_single_object_and_skips_nested()
    {
        var rows = JsonFlattener.Flatten("{\"a\":1,\"nested\":{\"b\":2}}");
        Assert.Single(rows);
        Assert.True(rows[0].ContainsKey("a"));
        Assert.False(rows[0].ContainsKey("nested"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Edfx.Web.Tests --filter JsonFlattenerTests`
Expected: FAIL — `JsonFlattener` does not exist (compile error).

- [ ] **Step 3: Create `JsonFlattener` (move the body verbatim from `ExportController.Flatten`)**

```csharp
// src/Edfx.Web/Services/JsonFlattener.cs
using System.Text.Json;

namespace Edfx.Web.Services;

/// <summary>Flattens an EDF-X JSON response into scalar rows for CSV/Excel/PDF export.</summary>
public static class JsonFlattener
{
    public static List<Dictionary<string, object?>> Flatten(string raw)
    {
        using var doc = JsonDocument.Parse(raw);
        var rows = new List<Dictionary<string, object?>>();
        void AddObj(JsonElement o)
        {
            var d = new Dictionary<string, object?>();
            foreach (var p in o.EnumerateObject())
                if (p.Value.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array))
                    d[p.Name] = p.Value.ToString();
            if (d.Count > 0) rows.Add(d);
        }
        var root = doc.RootElement;
        if (root.TryGetProperty("entities", out var ents) && ents.ValueKind == JsonValueKind.Array)
            foreach (var e in ents.EnumerateArray()) AddObj(e);
        else if (root.ValueKind == JsonValueKind.Array)
            foreach (var e in root.EnumerateArray()) AddObj(e);
        else AddObj(root);
        return rows;
    }
}
```

- [ ] **Step 4: Update `ExportController` to use it; remove the private `Flatten`**

In `src/Edfx.Web/Controllers/ExportController.cs`:
- In `Download(...)`, change `var rows = Flatten(raw);` to `var rows = JsonFlattener.Flatten(raw);`
- Delete the entire `private static List<Dictionary<string, object?>> Flatten(string raw) { ... }` method.
- Ensure `using Edfx.Web.Services;` is present (it already is — `Exporter` lives there).

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test tests/Edfx.Web.Tests --filter JsonFlattenerTests`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/Edfx.Web/Services/JsonFlattener.cs src/Edfx.Web/Controllers/ExportController.cs tests/Edfx.Web.Tests/JsonFlattenerTests.cs
git commit -m "refactor: extract shared JsonFlattener from ExportController

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Centralize the section catalogue

**Files:**
- Create: `src/Edfx.Web/Services/SectionCatalogue.cs`
- Modify: `src/Edfx.Web/Components/Pages/Entity.razor` (use the catalogue)
- Test: `tests/Edfx.Web.Tests/SectionCatalogueTests.cs`

**Interfaces:**
- Produces:
  - `Edfx.Web.Services.SectionCatalogue.Section` record `(string Key, string Title)`
  - `SectionCatalogue.All -> IReadOnlyList<Section>` (15 entries, canonical order)
  - `SectionCatalogue.Title(string key) -> string` (falls back to the key)

- [ ] **Step 1: Write the failing test**

```csharp
// tests/Edfx.Web.Tests/SectionCatalogueTests.cs
using Edfx.Web.Services;

public class SectionCatalogueTests
{
    [Fact]
    public void Contains_all_fifteen_sections()
    {
        Assert.Equal(15, SectionCatalogue.All.Count);
        Assert.Equal("PD (best estimate)", SectionCatalogue.Title("pds"));
        Assert.Equal("Credit Limit", SectionCatalogue.Title("credit_limit"));
    }

    [Fact]
    public void Title_falls_back_to_key_when_unknown()
    {
        Assert.Equal("unknown_key", SectionCatalogue.Title("unknown_key"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Edfx.Web.Tests --filter SectionCatalogueTests`
Expected: FAIL — `SectionCatalogue` does not exist.

- [ ] **Step 3: Create `SectionCatalogue`**

```csharp
// src/Edfx.Web/Services/SectionCatalogue.cs
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
```

- [ ] **Step 4: Update `Entity.razor` to use the catalogue**

In `src/Edfx.Web/Components/Pages/Entity.razor`:
- The `@using Edfx.Web.Services` directive is already present.
- Replace the `@foreach (var s in Sections)` loop with `@foreach (var s in SectionCatalogue.All)`.
- In `ExtractAll()`, replace `Sections.Select(s => s.Key)` with `SectionCatalogue.All.Select(s => s.Key)`.
- Delete the local `record Sec(...)` declaration and the `static readonly Sec[] Sections = { ... }` array.

Resulting `@code` block:

```csharp
@code {
  [Parameter] public string EntityId { get; set; } = "";
  bool running; string current = "";
  async Task ExtractAll()
  {
    running = true;
    try { await Extractor.ExtractAllAsync(EntityId, SectionCatalogue.All.Select(s => s.Key),
            s => { current = s; InvokeAsync(StateHasChanged); }); }
    finally { running = false; }
  }
}
```

- [ ] **Step 5: Run tests + build to verify**

Run: `dotnet test tests/Edfx.Web.Tests --filter SectionCatalogueTests`
Expected: PASS (2 tests).
Run: `dotnet build src/Edfx.Web`
Expected: Build succeeded (Entity.razor still compiles).

- [ ] **Step 6: Commit**

```bash
git add src/Edfx.Web/Services/SectionCatalogue.cs src/Edfx.Web/Components/Pages/Entity.razor tests/Edfx.Web.Tests/SectionCatalogueTests.cs
git commit -m "refactor: centralize section catalogue used by entity page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Repository read methods for results (hub + detail)

**Files:**
- Modify: `src/Edfx.Storage/ExtractionRepository.cs` (add 2 records + 2 methods)
- Test: `tests/Edfx.Storage.Tests/ExtractionRepositoryTests.cs` (append 2 `[SkippableFact]` tests)

**Interfaces:**
- Produces:
  - record `Edfx.Storage.EntityResults(string EntityId, string? Name, int SectionCount, DateTimeOffset LastExtractedAt)`
  - record `Edfx.Storage.SectionResult(string Section, int Version, int HttpStatus, string Status, string Raw)`
  - `ExtractionRepository.EntitiesWithExtractions() -> List<EntityResults>`
  - `ExtractionRepository.LatestPerSection(string entityId) -> List<SectionResult>`

- [ ] **Step 1: Write the failing tests (append to `ExtractionRepositoryTests`)**

```csharp
    [SkippableFact]
    public void EntitiesWithExtractions_groups_by_entity_with_counts()
    {
        var repo = new ExtractionRepository(new Db(_f.Conn!));
        repo.UpsertEntity("ENT_A", "Alpha Ltd", "US");
        repo.SaveExtraction("ENT_A", "pds", "{\"pd\":0.01}", 200, "ok", "{}");
        repo.SaveExtraction("ENT_A", "ratios", "{\"a\":1}", 200, "ok", "{}");
        repo.SaveExtraction("ENT_A", "ratios", "{\"a\":2}", 200, "ok", "{}"); // 2nd version, same section

        var all = repo.EntitiesWithExtractions();
        var a = all.Single(e => e.EntityId == "ENT_A");
        Assert.Equal("Alpha Ltd", a.Name);
        Assert.Equal(2, a.SectionCount); // distinct sections, not versions
    }

    [SkippableFact]
    public void LatestPerSection_returns_latest_version_of_each_section()
    {
        var repo = new ExtractionRepository(new Db(_f.Conn!));
        repo.SaveExtraction("ENT_B", "pds", "{\"pd\":0.01}", 200, "ok", "{}");
        repo.SaveExtraction("ENT_B", "pds", "{\"pd\":0.02}", 200, "ok", "{}");
        repo.SaveExtraction("ENT_B", "ratios", "{\"a\":1}", 200, "ok", "{}");

        var latest = repo.LatestPerSection("ENT_B");
        Assert.Equal(2, latest.Count);
        var pds = latest.Single(s => s.Section == "pds");
        Assert.Equal(2, pds.Version);
        Assert.Equal("{\"pd\":0.02}", pds.Raw);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/Edfx.Storage.Tests --filter ExtractionRepositoryTests`
Expected: FAIL to compile (methods missing). (If `EDFX_TEST_DB` unset, the new tests would Skip — but compilation fails first, which is the failing state we want.)

- [ ] **Step 3: Add records + methods to `ExtractionRepository.cs`**

Add the records next to the existing ones near the top of the file (after `RecentExtraction`):

```csharp
public record EntityResults(string EntityId, string? Name, int SectionCount, DateTimeOffset LastExtractedAt);
public record SectionResult(string Section, int Version, int HttpStatus, string Status, string Raw);
```

Add the methods inside the `ExtractionRepository` class (after `Recent`):

```csharp
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
```

- [ ] **Step 4: Run tests to verify they pass (or skip cleanly)**

Run: `dotnet build src/Edfx.Storage` → Expected: Build succeeded.
Run: `dotnet test tests/Edfx.Storage.Tests --filter ExtractionRepositoryTests`
Expected: PASS if `EDFX_TEST_DB` is set; otherwise the two new tests report **Skipped** (acceptable — compilation succeeds).

- [ ] **Step 5: Commit**

```bash
git add src/Edfx.Storage/ExtractionRepository.cs tests/Edfx.Storage.Tests/ExtractionRepositoryTests.cs
git commit -m "feat(storage): add EntitiesWithExtractions + LatestPerSection reads

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Entity-name storage + resolution + backfill

**Files:**
- Modify: `src/Edfx.Storage/ExtractionRepository.cs` (`GetEntityName`, `SetEntityName`, `EntityIdsMissingName`)
- Modify: `src/Edfx.Web/Services/IExtractionSaver.cs` (3 new members)
- Modify: `src/Edfx.Web/Services/SaverAdapter.cs` (implement them)
- Modify: `src/Edfx.Web/Services/ExtractionService.cs` (`EnsureEntityNameAsync`, `BackfillMissingNamesAsync`, call on extract)
- Test: `tests/Edfx.Web.Tests/ExtractionServiceTests.cs` (append 2 tests)

**Interfaces:**
- Consumes: `IEdfxClient.SearchAsync(string, int)` → `(EntitySearchResponse, string)`; `EntitySummary.InternationalName`.
- Produces:
  - `ExtractionRepository.GetEntityName(string) -> string?`
  - `ExtractionRepository.SetEntityName(string entityId, string? name) -> void`
  - `ExtractionRepository.EntityIdsMissingName() -> List<string>`
  - `IExtractionSaver.HasEntityName(string) -> bool`
  - `IExtractionSaver.SaveEntityName(string, string?) -> void`
  - `IExtractionSaver.EntityIdsMissingName() -> List<string>`
  - `ExtractionService.EnsureEntityNameAsync(string) -> Task`
  - `ExtractionService.BackfillMissingNamesAsync() -> Task`

- [ ] **Step 1: Write the failing tests (append to `ExtractionServiceTests`)**

Add `using Edfx.Domain;` to the top of the file (for `EntitySearchResponse`/`EntitySummary`).

```csharp
    [Fact]
    public async Task Resolves_and_saves_entity_name_when_missing()
    {
        var client = Substitute.For<IEdfxClient>();
        client.ExtractAsync("pds", Arg.Any<IEnumerable<string>>(), null, null, null)
              .Returns(("{\"entities\":[{\"pd\":0.01}]}", 200));
        client.SearchAsync("E1", 1).Returns((new EntitySearchResponse
        {
            Entities = { new EntitySummary { EntityId = "E1", InternationalName = "Acme Corp" } }
        }, ""));
        var saver = Substitute.For<IExtractionSaver>();
        saver.Save("E1", "pds", Arg.Any<string>(), 200, "ok", Arg.Any<string>()).Returns(1);
        saver.HasEntityName("E1").Returns(false);
        var sut = new ExtractionService(client, saver, NullLogger<ExtractionService>.Instance);

        await sut.ExtractAndSaveAsync("E1", "pds");

        saver.Received().SaveEntityName("E1", "Acme Corp");
    }

    [Fact]
    public async Task Skips_name_lookup_when_already_present()
    {
        var client = Substitute.For<IEdfxClient>();
        client.ExtractAsync("pds", Arg.Any<IEnumerable<string>>(), null, null, null)
              .Returns(("{\"entities\":[{\"pd\":0.01}]}", 200));
        var saver = Substitute.For<IExtractionSaver>();
        saver.Save("E1", "pds", Arg.Any<string>(), 200, "ok", Arg.Any<string>()).Returns(1);
        saver.HasEntityName("E1").Returns(true);
        var sut = new ExtractionService(client, saver, NullLogger<ExtractionService>.Instance);

        await sut.ExtractAndSaveAsync("E1", "pds");

        await client.DidNotReceive().SearchAsync("E1", Arg.Any<int>());
        saver.DidNotReceive().SaveEntityName(Arg.Any<string>(), Arg.Any<string?>());
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/Edfx.Web.Tests --filter ExtractionServiceTests`
Expected: FAIL to compile — `HasEntityName`/`SaveEntityName` not on `IExtractionSaver`.

- [ ] **Step 3: Add repository name methods**

In `src/Edfx.Storage/ExtractionRepository.cs`, add inside the class:

```csharp
    public string? GetEntityName(string entityId)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand("select name from entities where entity_id=@e", c);
        cmd.Parameters.AddWithValue("e", entityId);
        return cmd.ExecuteScalar() as string;
    }

    /// <summary>Sets the entity display name without clobbering other columns.</summary>
    public void SetEntityName(string entityId, string? name)
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            insert into entities(entity_id, name) values(@e,@n)
            on conflict(entity_id) do update set name=excluded.name, last_seen_at=now();
            """, c);
        cmd.Parameters.AddWithValue("e", entityId);
        cmd.Parameters.AddWithValue("n", (object?)name ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    /// <summary>Entity ids that have extractions but no resolved name yet.</summary>
    public List<string> EntityIdsMissingName()
    {
        using var c = _db.Open();
        using var cmd = new NpgsqlCommand(
            """
            select distinct x.entity_id
            from extractions x
            left join entities e on e.entity_id = x.entity_id
            where e.name is null or e.name = '';
            """, c);
        var list = new List<string>();
        using var rd = cmd.ExecuteReader();
        while (rd.Read()) list.Add(rd.GetString(0));
        return list;
    }
```

- [ ] **Step 4: Extend `IExtractionSaver` and `SaverAdapter`**

`src/Edfx.Web/Services/IExtractionSaver.cs`:

```csharp
namespace Edfx.Web.Services;

public interface IExtractionSaver
{
    int Save(string entityId, string section, string raw, int httpStatus, string status, string requestParams);
    bool HasEntityName(string entityId);
    void SaveEntityName(string entityId, string? name);
    List<string> EntityIdsMissingName();
}
```

`src/Edfx.Web/Services/SaverAdapter.cs` — add to the class:

```csharp
    public bool HasEntityName(string entityId)
        => !string.IsNullOrWhiteSpace(_repo.GetEntityName(entityId));

    public void SaveEntityName(string entityId, string? name)
        => _repo.SetEntityName(entityId, name);

    public List<string> EntityIdsMissingName()
        => _repo.EntityIdsMissingName();
```

- [ ] **Step 5: Add name resolution to `ExtractionService`**

In `src/Edfx.Web/Services/ExtractionService.cs`, inside `ExtractAndSaveAsync`, after the
`_logger.LogInformation(...)` line and before `return new ExtractResult(...)`, insert:

```csharp
        // Resolve + store the entity name once (best-effort; never blocks extraction).
        try { await EnsureEntityNameAsync(entityId); }
        catch (Exception ex) { _logger.LogWarning(ex, "Name resolution failed for {EntityId}", entityId); }
```

Add these two methods to the class:

```csharp
    /// <summary>Looks up and stores the entity's display name if it isn't known yet.</summary>
    public async Task EnsureEntityNameAsync(string entityId)
    {
        if (_saver.HasEntityName(entityId)) return;
        var (search, _) = await _client.SearchAsync(entityId, 1);
        var name = search?.Entities?.FirstOrDefault()?.InternationalName;
        if (!string.IsNullOrWhiteSpace(name)) _saver.SaveEntityName(entityId, name);
    }

    /// <summary>Resolves names for any extracted entities that don't have one yet.</summary>
    public async Task BackfillMissingNamesAsync()
    {
        foreach (var id in _saver.EntityIdsMissingName())
        {
            try
            {
                var (search, _) = await _client.SearchAsync(id, 1);
                var name = search?.Entities?.FirstOrDefault()?.InternationalName;
                if (!string.IsNullOrWhiteSpace(name)) _saver.SaveEntityName(id, name);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Backfill name failed for {EntityId}", id); }
        }
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `dotnet test tests/Edfx.Web.Tests --filter ExtractionServiceTests`
Expected: PASS (3 tests total — the original `Extract_calls_client_and_saves_raw` still passes because `SearchAsync` is unstubbed there and the `?.` guards make name resolution a no-op).

- [ ] **Step 7: Commit**

```bash
git add src/Edfx.Storage/ExtractionRepository.cs src/Edfx.Web/Services/IExtractionSaver.cs src/Edfx.Web/Services/SaverAdapter.cs src/Edfx.Web/Services/ExtractionService.cs tests/Edfx.Web.Tests/ExtractionServiceTests.cs
git commit -m "feat: resolve and store entity names on extract + backfill

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `ReportAssembler` + `PdfReportBuilder` (QuestPDF)

**Files:**
- Modify: `src/Edfx.Web/Edfx.Web.csproj` (add QuestPDF package)
- Create: `src/Edfx.Web/Services/ReportAssembler.cs`
- Create: `src/Edfx.Web/Services/PdfReportBuilder.cs`
- Test: `tests/Edfx.Web.Tests/ReportAssemblerTests.cs`
- Test: `tests/Edfx.Web.Tests/PdfReportBuilderTests.cs`

**Interfaces:**
- Consumes: `Edfx.Storage.SectionResult` (Task 3); `JsonFlattener` (Task 1); `SectionCatalogue` (Task 2).
- Produces:
  - `ReportAssembler.Order(IReadOnlyList<SectionResult> latest) -> List<(string Title, List<Dictionary<string, object?>> Rows)>`
  - `PdfReportBuilder.Build(string entityId, string? entityName, IReadOnlyList<(string Title, List<Dictionary<string, object?>> Rows)> sections) -> byte[]`

- [ ] **Step 1: Add the QuestPDF package**

Run: `dotnet add src/Edfx.Web package QuestPDF`
Expected: adds a `<PackageReference Include="QuestPDF" ... />` to `Edfx.Web.csproj`.

- [ ] **Step 2: Write the failing tests**

```csharp
// tests/Edfx.Web.Tests/ReportAssemblerTests.cs
using Edfx.Storage;
using Edfx.Web.Services;

public class ReportAssemblerTests
{
    [Fact]
    public void Order_follows_catalogue_and_drops_empty_sections()
    {
        var latest = new List<SectionResult>
        {
            new("ratios", 1, 200, "ok", "{\"entities\":[{\"currentRatio\":1.5}]}"),
            new("pds", 1, 200, "ok", "{\"entities\":[{\"pd\":0.01}]}"),
            new("triggers", 1, 200, "ok", "{\"entities\":[]}"), // flattens to 0 rows -> dropped
        };

        var ordered = ReportAssembler.Order(latest);

        Assert.Equal(2, ordered.Count);
        Assert.Equal("PD (best estimate)", ordered[0].Title);   // pds precedes ratios in the catalogue
        Assert.Equal("Financial Ratios", ordered[1].Title);
    }
}
```

```csharp
// tests/Edfx.Web.Tests/PdfReportBuilderTests.cs
using Edfx.Web.Services;

public class PdfReportBuilderTests
{
    [Fact]
    public void Build_produces_a_valid_pdf()
    {
        var sections = new List<(string Title, List<Dictionary<string, object?>> Rows)>
        {
            ("PD (best estimate)", new List<Dictionary<string, object?>>
            {
                new() { ["pd"] = "0.01", ["rating"] = "Ba1" },
            }),
        };

        var bytes = PdfReportBuilder.Build("ZA123", "Sasol Ltd", sections);

        Assert.True(bytes.Length > 0);
        // PDF magic header "%PDF"
        Assert.Equal(0x25, bytes[0]);
        Assert.Equal(0x50, bytes[1]);
        Assert.Equal(0x44, bytes[2]);
        Assert.Equal(0x46, bytes[3]);
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `dotnet test tests/Edfx.Web.Tests --filter "ReportAssemblerTests|PdfReportBuilderTests"`
Expected: FAIL to compile — `ReportAssembler` / `PdfReportBuilder` don't exist.

- [ ] **Step 4: Create `ReportAssembler`**

```csharp
// src/Edfx.Web/Services/ReportAssembler.cs
using Edfx.Storage;

namespace Edfx.Web.Services;

/// <summary>Turns the latest-per-section rows into ordered, non-empty (title, rows) groups.</summary>
public static class ReportAssembler
{
    public static List<(string Title, List<Dictionary<string, object?>> Rows)> Order(IReadOnlyList<SectionResult> latest)
    {
        var bySection = latest.ToDictionary(s => s.Section, s => s);
        var ordered = new List<(string, List<Dictionary<string, object?>>)>();
        foreach (var sec in SectionCatalogue.All)
        {
            if (!bySection.TryGetValue(sec.Key, out var row)) continue;
            var rows = JsonFlattener.Flatten(row.Raw);
            if (rows.Count == 0) continue;
            ordered.Add((sec.Title, rows));
        }
        return ordered;
    }
}
```

- [ ] **Step 5: Create `PdfReportBuilder`**

```csharp
// src/Edfx.Web/Services/PdfReportBuilder.cs
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Edfx.Web.Services;

/// <summary>Renders a consolidated EDF-X report (cover page + one table per section) as a PDF.</summary>
public static class PdfReportBuilder
{
    static PdfReportBuilder()
    {
        // Community license: free for organisations with annual revenue under $1M USD.
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Build(
        string entityId, string? entityName,
        IReadOnlyList<(string Title, List<Dictionary<string, object?>> Rows)> sections)
    {
        var heading = string.IsNullOrWhiteSpace(entityName) ? entityId : entityName;

        return Document.Create(container =>
        {
            // Cover page
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.Content().AlignMiddle().Column(col =>
                {
                    col.Item().Text("EDF-X Extraction Report").FontSize(26).Bold();
                    col.Item().PaddingTop(10).Text(heading).FontSize(20);
                    col.Item().Text($"Entity ID: {entityId}").FontSize(12).FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingTop(20).Text($"Sections: {sections.Count}").FontSize(12);
                    col.Item().Text($"Generated: {DateTime.Now:yyyy-MM-dd HH:mm}").FontSize(12);
                });
            });

            // Content page(s) — flows/paginates automatically
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.Header().Text(heading).SemiBold().FontColor(Colors.Grey.Darken2);
                page.Footer().AlignCenter().Text(t =>
                {
                    t.CurrentPageNumber();
                    t.Span(" / ");
                    t.TotalPages();
                });
                page.Content().Column(col =>
                {
                    foreach (var (title, rows) in sections)
                    {
                        col.Item().PaddingTop(12).Text(title).FontSize(14).Bold();
                        var cols = rows[0].Keys.ToList();
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(def => { foreach (var _ in cols) def.RelativeColumn(); });
                            foreach (var c in cols)
                                table.Cell().Element(HeaderCell).Text(c);
                            foreach (var r in rows)
                                foreach (var c in cols)
                                    table.Cell().Element(BodyCell).Text(Convert.ToString(r.GetValueOrDefault(c)) ?? "");
                        });
                    }
                });
            });
        }).GeneratePdf();

        static IContainer HeaderCell(IContainer c) =>
            c.Background(Colors.Grey.Lighten2).Padding(4).DefaultTextStyle(x => x.SemiBold());
        static IContainer BodyCell(IContainer c) =>
            c.BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4);
    }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `dotnet test tests/Edfx.Web.Tests --filter "ReportAssemblerTests|PdfReportBuilderTests"`
Expected: PASS (2 tests). If `PdfReportBuilderTests` throws a QuestPDF license exception, confirm the static constructor set `LicenseType.Community` (it runs before `Build`).

- [ ] **Step 7: Commit**

```bash
git add src/Edfx.Web/Edfx.Web.csproj src/Edfx.Web/Services/ReportAssembler.cs src/Edfx.Web/Services/PdfReportBuilder.cs tests/Edfx.Web.Tests/ReportAssemblerTests.cs tests/Edfx.Web.Tests/PdfReportBuilderTests.cs
git commit -m "feat: consolidated PDF report builder (QuestPDF) + section assembler

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `report.pdf` export route

**Files:**
- Modify: `src/Edfx.Web/Controllers/ExportController.cs` (add the route)

**Interfaces:**
- Consumes: `ExtractionRepository.LatestPerSection`, `ExtractionRepository.GetEntityName` (Task 3/4); `ReportAssembler.Order`, `PdfReportBuilder.Build` (Task 5).
- Produces: HTTP `GET /export/{entityId}/report.pdf` → `application/pdf` (404 when the entity has no flattenable sections).

- [ ] **Step 1: Add the route to `ExportController`**

Insert this action into the `ExportController` class (after `Download`):

```csharp
    [HttpGet("{entityId}/report.pdf")]
    public IActionResult Report(string entityId)
    {
        var sections = ReportAssembler.Order(_repo.LatestPerSection(entityId));
        if (sections.Count == 0) return NotFound();
        var name = _repo.GetEntityName(entityId);
        var pdf = PdfReportBuilder.Build(entityId, name, sections);
        var safeName = string.IsNullOrWhiteSpace(name) ? entityId : name;
        return File(pdf, "application/pdf", $"{safeName} - EDF-X Report.pdf");
    }
```

(`using Edfx.Web.Services;` is already present; `_repo` is the injected `ExtractionRepository`.)

- [ ] **Step 2: Build to verify it compiles**

Run: `dotnet build src/Edfx.Web`
Expected: Build succeeded.

- [ ] **Step 3: Manual smoke test (requires the DB + a previously-extracted entity)**

Stop any running instance, then run: `dotnet run --project src/Edfx.Web`
Run: `curl -s -o report.pdf -w "%{http_code} %{content_type}\n" http://localhost:5260/export/ZA197900323106/report.pdf`
Expected: `200 application/pdf`, and `report.pdf` begins with `%PDF`.

- [ ] **Step 4: Commit**

```bash
git add src/Edfx.Web/Controllers/ExportController.cs
git commit -m "feat: add /export/{id}/report.pdf consolidated PDF route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Results hub page (`/results`) + nav link

**Files:**
- Create: `src/Edfx.Web/Components/Pages/Results.razor`
- Modify: `src/Edfx.Web/Components/Layout/NavMenu.razor` (add "Results" link)

**Interfaces:**
- Consumes: `ExtractionRepository.EntitiesWithExtractions` (Task 3); `ExtractionService.BackfillMissingNamesAsync` (Task 4).

- [ ] **Step 1: Create `Results.razor`**

```razor
@page "/results"
@rendermode InteractiveServer
@using Edfx.Storage
@using Edfx.Web.Services
@using Microsoft.Extensions.DependencyInjection
@inject ExtractionRepository Repo
@inject IServiceScopeFactory ScopeFactory
<PageTitle>Results</PageTitle>
<h2>Extracted Entities</h2>

<input @bind="search" @bind:event="oninput" class="form-control mb-2" style="max-width:460px"
       placeholder="Search by entity name or ID…" />

@if (entities is null)
{
  <p>Loading…</p>
}
else if (entities.Count == 0)
{
  <p class="text-muted">No extractions yet. Extract an entity to see it here.</p>
}
else
{
  var rows = Filtered();
  <p class="text-muted">@rows.Count of @entities.Count entities</p>
  <table class="table table-sm">
    <thead><tr><th>Entity Name</th><th>Entity ID</th><th>Sections</th><th>Last Extracted</th><th></th></tr></thead>
    <tbody>
    @foreach (var e in rows)
    {
      <tr>
        <td>@(string.IsNullOrWhiteSpace(e.Name) ? "(name pending)" : e.Name)</td>
        <td>@e.EntityId</td>
        <td>@e.SectionCount</td>
        <td>@e.LastExtractedAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm")</td>
        <td><a class="btn btn-sm btn-primary" href="@($"/results/{e.EntityId}")">View results</a></td>
      </tr>
    }
    </tbody>
  </table>
}

@code {
  string search = "";
  List<EntityResults>? entities;

  protected override void OnInitialized()
  {
    try { entities = Repo.EntitiesWithExtractions(); }
    catch { entities = new(); }

    // Resolve any missing names in the background, in a fresh DI scope so it never blocks the page.
    _ = Task.Run(async () =>
    {
        try
        {
            using var scope = ScopeFactory.CreateScope();
            var svc = scope.ServiceProvider.GetRequiredService<ExtractionService>();
            await svc.BackfillMissingNamesAsync();
        }
        catch { /* best-effort */ }
    });
  }

  List<EntityResults> Filtered()
  {
    if (entities is null) return new();
    var q = search?.Trim();
    if (string.IsNullOrEmpty(q)) return entities;
    return entities.Where(e =>
      e.EntityId.Contains(q, StringComparison.OrdinalIgnoreCase) ||
      (e.Name?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false)).ToList();
  }
}
```

- [ ] **Step 2: Add the nav link**

In `src/Edfx.Web/Components/Layout/NavMenu.razor`, add a nav item after the History one:

```razor
        <div class="nav-item px-3">
            <NavLink class="nav-link" href="results">Results</NavLink>
        </div>
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build src/Edfx.Web`
Expected: Build succeeded.

- [ ] **Step 4: Manual smoke test**

Stop any running instance, then run: `dotnet run --project src/Edfx.Web`
Run: `curl -s http://localhost:5260/results | grep -oiE "Extracted Entities|ZA197900323106"`
Expected: both strings present (the page renders and lists the extracted entity).

- [ ] **Step 5: Commit**

```bash
git add src/Edfx.Web/Components/Pages/Results.razor src/Edfx.Web/Components/Layout/NavMenu.razor
git commit -m "feat: results hub page listing entities by name + nav link

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Results detail page (`/results/{entityId}`)

**Files:**
- Create: `src/Edfx.Web/Components/Pages/ResultsDetail.razor`

**Interfaces:**
- Consumes: `ExtractionRepository.GetEntityName`, `ExtractionRepository.LatestPerSection` (Task 3/4); `ReportAssembler.Order` (Task 5); the `/export/{id}/report.pdf` route (Task 6).

- [ ] **Step 1: Create `ResultsDetail.razor`**

```razor
@page "/results/{EntityId}"
@rendermode InteractiveServer
@using Edfx.Storage
@using Edfx.Web.Services
@inject ExtractionRepository Repo
<PageTitle>Results @EntityId</PageTitle>

<a href="/results" class="text-decoration-none">‹ All results</a>
<div class="d-flex justify-content-between align-items-center my-2">
  <h2 class="mb-0">@(string.IsNullOrWhiteSpace(name) ? EntityId : name)</h2>
  @if (sections.Count > 0)
  {
    <a class="btn btn-danger" href="@($"/export/{EntityId}/report.pdf")">Download Consolidated PDF</a>
  }
</div>
<div class="text-muted mb-3">Entity ID: @EntityId</div>

@if (!loaded)
{
  <p>Loading…</p>
}
else if (sections.Count == 0)
{
  <p class="text-muted">No saved results for this entity.</p>
}
else
{
  @foreach (var (title, rows) in sections)
  {
    <div class="card mb-3"><div class="card-body">
      <h5>@title</h5>
      <div class="table-responsive">
        <table class="table table-sm table-striped">
          <thead><tr>@foreach (var col in rows[0].Keys) { <th>@col</th> }</tr></thead>
          <tbody>
          @foreach (var r in rows)
          {
            <tr>@foreach (var col in rows[0].Keys) { <td>@Convert.ToString(r.GetValueOrDefault(col))</td> }</tr>
          }
          </tbody>
        </table>
      </div>
    </div></div>
  }
}

@code {
  [Parameter] public string EntityId { get; set; } = "";
  string? name;
  bool loaded;
  List<(string Title, List<Dictionary<string, object?>> Rows)> sections = new();

  protected override void OnInitialized()
  {
    try
    {
        name = Repo.GetEntityName(EntityId);
        sections = ReportAssembler.Order(Repo.LatestPerSection(EntityId));
    }
    catch { sections = new(); }
    loaded = true;
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `dotnet build src/Edfx.Web`
Expected: Build succeeded.

- [ ] **Step 3: Manual smoke test (full flow)**

Stop any running instance, then run: `dotnet run --project src/Edfx.Web`
- Browse to `http://localhost:5260/results` → entity appears by name (after a moment, "(name pending)" resolves on reload).
- Click **View results** → `http://localhost:5260/results/ZA197900323106` shows section tables.
- Click **Download Consolidated PDF** → a `<name> - EDF-X Report.pdf` downloads and opens with a cover page + per-section tables.

Verify the route directly:
Run: `curl -s http://localhost:5260/results/ZA197900323106 | grep -oiE "Download Consolidated PDF|Entity ID"`
Expected: both strings present.

- [ ] **Step 4: Run the full test suite**

Run: `dotnet test`
Expected: All tests pass (DB-only `[SkippableFact]` tests skip unless `EDFX_TEST_DB` is set).

- [ ] **Step 5: Commit**

```bash
git add src/Edfx.Web/Components/Pages/ResultsDetail.razor
git commit -m "feat: per-entity results detail page with consolidated PDF download

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- "Structure by entity name" → Tasks 3/4 (name storage + backfill) + Task 7 (hub lists by name). ✓
- "UI that displays the results" → Task 7 (hub) + Task 8 (detail tables). ✓
- "Download consolidated PDF of all results" → Task 5 (builder) + Task 6 (route) + Task 8 (button). ✓
- Shared refactors (`JsonFlattener`, `SectionCatalogue`) → Tasks 1–2. ✓
- Repository methods (`EntitiesWithExtractions`, `LatestPerSection`, name methods) → Tasks 3–4. ✓
- Error handling (missing name → ID; no sections → 404/empty; DB down → empty) → Tasks 6–8. ✓
- Testing (JsonFlattener, PdfReportBuilder %PDF, SectionCatalogue, name resolution, repo integration) → covered. ✓
- QuestPDF Community license via static ctor → Task 5. ✓

**Type consistency:** `EntityResults`, `SectionResult` records (Task 3) are consumed unchanged in Tasks 5–8. `ReportAssembler.Order` return type `List<(string Title, List<Dictionary<string,object?>> Rows)>` matches `PdfReportBuilder.Build`'s `sections` parameter and the `ResultsDetail.razor` field. `IExtractionSaver` members added in Task 4 match `SaverAdapter` + `ExtractionService` usage. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; tests have real assertions. ✓
