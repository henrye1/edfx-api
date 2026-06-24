# Results-by-entity UI + consolidated PDF — Design

Date: 2026-06-24
Status: Approved (pending spec review)

## Goal

In the Blazor extractor app (`Edfx.Web`, http://localhost:5260), let the user:

1. Browse extracted results **organized by entity name** (not the cryptic BVD ID).
2. Open a per-entity results page that **displays all saved sections**.
3. **Download a single consolidated PDF** of all that entity's results from the results page.

## Context

- Extractions are saved to Supabase `extractions` (versioned, immutable, raw JSON per
  `entity_id` + `section`). The `entities` table has a `name` column that is currently
  **not populated** during extraction — so results can only be identified by ID today.
- Export today is per-section CSV/Excel via `ExportController` (`/export/{id}/{section}.{fmt}`),
  using `Exporter` (ClosedXML) and a private `Flatten(...)` JSON→rows helper.
- The entity name is obtainable from `IEdfxClient.SearchAsync(entityId)` →
  `Entities[0].InternationalName` (works in both live and mock modes; this is how
  `SearchController.Summary` already resolves names).
- Canonical section list (key → title) currently lives inline in `Entity.razor`.

## Decisions (from brainstorming)

- **Layout:** Hub list (entities by name) → per-entity results detail page.
- **PDF format:** Cover page + one formatted table per section.
- **Name source:** Store on extract going forward **and** backfill existing rows.
- **PDF library:** QuestPDF (Community license). Assumes company annual revenue < $1M USD.
  If that assumption is wrong, swap for PDFsharp/MigraDoc (MIT, unconditionally free).

## Architecture

All work is in the `Edfx.Web` (Blazor) + `Edfx.Storage` projects. No React changes.

### 1. Entity name population

- **On extract:** `ExtractionService` resolves and stores the name when it is missing.
  Add `EnsureEntityNameAsync(entityId)`: if `entities.name` is null, call
  `IEdfxClient.SearchAsync(entityId, 1)`, take `InternationalName`, and persist via the
  existing `ExtractionRepository.UpsertEntity(entityId, name, country)`. Called once per
  extract action (cheap: a name lookup happens only when the stored name is absent).
- **Backfill:** `ExtractionRepository.EntityIdsMissingName()` returns entity IDs that have
  extractions but a null/empty name. A backfill routine resolves each via the client and
  upserts the name. Triggered automatically (and idempotently) when the Results hub loads;
  runs in the background so it never blocks the page.

### 2. Results hub — `/results`

- New `Results.razor` page + a **"Results"** nav link in `NavMenu.razor`.
- Lists entities that have at least one extraction, **by name** (falls back to ID).
  Columns: Entity Name · Entity ID · # sections · last extracted · open link.
- Client-side search box filters by name/ID (consistent with the History page).
- Backed by `ExtractionRepository.EntitiesWithExtractions()`.

### 3. Results detail — `/results/{entityId}`

- New `ResultsDetail.razor`.
- Header: entity name + ID. Prominent **"Download Consolidated PDF"** button linking to
  `/export/{entityId}/report.pdf`.
- Body: for each section that has saved data (canonical order), a friendly title and a
  formatted HTML table of the flattened latest rows, plus per-section CSV/Excel links.
- Sections with no saved data are omitted.
- Backed by `ExtractionRepository.LatestPerSection(entityId)`.

### 4. Consolidated PDF — `GET /export/{entityId}/report.pdf`

- New `PdfReportBuilder` service (QuestPDF). Input: entity name + ID + ordered list of
  `(sectionTitle, rows)`. Output: `byte[]`.
  - **Cover page:** entity name, entity ID, generation date, section count.
  - **Body:** one heading + table per section (flattened rows). Long tables paginate.
- New route on `ExportController`: `GET {entityId}/report.pdf`. Loads
  `LatestPerSection`, flattens each via the shared flattener, builds the PDF, returns it
  as `application/pdf` named `"{entityName} - EDF-X Report.pdf"` (ID if name unknown).
- `QuestPDF.Settings.License = LicenseType.Community;` set once at startup (`Program.cs`).

### 5. Shared refactors (DRY, serves this goal)

- **`JsonFlattener`**: move `ExportController.Flatten(...)` into a reusable static
  (e.g. `Edfx.Web/Services/JsonFlattener.cs`). Used by export, results table, and PDF.
- **Section catalogue**: centralize the section key→title list (currently inline in
  `Entity.razor`) into one shared definition consumed by the entity page, results detail,
  and the PDF, so ordering and titles stay consistent.

## New / changed components

| File | Change |
|---|---|
| `Edfx.Storage/ExtractionRepository.cs` | `EntitiesWithExtractions()`, `LatestPerSection(id)`, `EntityIdsMissingName()` |
| `Edfx.Web/Services/JsonFlattener.cs` | New — extracted from `ExportController.Flatten` |
| `Edfx.Web/Services/SectionCatalogue.cs` | New — canonical section key→title list |
| `Edfx.Web/Services/PdfReportBuilder.cs` | New — QuestPDF consolidated report |
| `Edfx.Web/Services/ExtractionService.cs` | `EnsureEntityNameAsync` + name backfill helper |
| `Edfx.Web/Controllers/ExportController.cs` | Add `report.pdf` route; use `JsonFlattener` |
| `Edfx.Web/Components/Pages/Results.razor` | New — hub |
| `Edfx.Web/Components/Pages/ResultsDetail.razor` | New — detail + PDF button |
| `Edfx.Web/Components/Layout/NavMenu.razor` | Add "Results" link |
| `Edfx.Web/Components/Pages/Entity.razor` | Use shared `SectionCatalogue` |
| `Edfx.Web/Program.cs` | QuestPDF Community license |
| `Edfx.Web/Edfx.Web.csproj` | Add `QuestPDF` package |

## Data flow

```
Extract (existing) ──► extractions (raw JSON)  +  EnsureEntityName ──► entities.name
Results hub  ──► EntitiesWithExtractions() ──► list by name  (+ background name backfill)
Results detail ──► LatestPerSection(id) ──► per-section tables (JsonFlattener)
PDF route ──► LatestPerSection(id) ──► JsonFlattener ──► PdfReportBuilder ──► application/pdf
```

## Error handling

- Name unresolved → display/name the file by entity ID.
- Entity with zero extractions → PDF route returns 404; hub omits it; detail button hidden.
- Section with no data → omitted from results and PDF.
- DB or EDF-X unavailable → defensive try/catch with empty states / logged warnings,
  matching the existing controllers and repository style.
- Name backfill failures are logged and skipped, never surfaced as page errors.

## Testing

- **`JsonFlattener`** — unit tests (pure function): nested object, `entities[]` wrapper,
  bare top-level array, scalars-only object. No DB.
- **`PdfReportBuilder`** — unit test: produces a non-empty byte array beginning with the
  `%PDF` magic header for a representative multi-section input.
- **`SectionCatalogue`** — covered indirectly; assert it contains all 15 keys.
- **Repository methods** — live-Postgres integration tests, skipped by default (existing
  `EDFX_TEST_DB` pattern).
- Full `dotnet test` stays green; manual run verifies hub → detail → PDF download.

## Out of scope

- No changes to the React portfolio app.
- No new persisted "report" artifacts (PDF is generated on demand, not stored).
- No multi-entity / portfolio-wide PDF (single entity per report).
