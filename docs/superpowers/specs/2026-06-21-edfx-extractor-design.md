# EDFX Extractor — Design Spec

**Date:** 2026-06-21
**Status:** Approved (design), pending implementation plan
**Owner:** Henry (Anchor Point Risk)

## 1. Purpose

Build an internal tool that connects to the Moody's Analytics **EDF-X API** and lets a
user extract as much company information as the API exposes, through a well-defined GUI
with full entity-search capability. Every extraction is persisted to a **Supabase
(Postgres)** database as an immutable, versioned system-of-record, because the data feeds
the firm's PD/LGD credit models where audit trail and lineage are critical.

## 2. Scope

In scope (full EDF-X endpoint coverage):

- **Entity search** — `/entity/v1/search` (single), `/entity/v1/mapping` (batch resolve)
- **PD values** — `/entities/pds`, `/entities/pds/riskcalc`
- **Financials** — `/entities/financials/statements`, `/entities/financials/ratios`,
  `/entities/financials/ratios/calculate`, templates
  `/entities/financials/template/universal` & `/template/bank`
- **Data upload / processes** — `/entities/modelInputs`, `/entities/payment`,
  `/processes/{processId}/status`, `/processes/{processId}/files`
- **Peer groups** — `/entities/peers/id`, `/metrics`, `/percentile`, `/metadata`,
  `/recommended`
- **Early warning** — `/tools/riskCategory`, `/tools/triggers`
- **Credit limits** — `/tools/creditLimit`
- **Search capability** by company name or any supported identifier (BVDID, ISIN, CUSIP,
  LEI, PID, ticker, tax number).
- **Export** to Excel and CSV (per section + full multi-sheet entity workbook).

Out of scope (v1): app login / multi-user auth (internal single-user), advanced
analytics on top of stored data, scheduled/automated pulls.

## 3. Non-functional requirements

- **Security:** EDFX credentials and the Supabase service key live only as server-side
  secrets (env vars). They are never sent to the browser. The Blazor server proxies all
  EDFX calls.
- **Audit / versioning:** extracted data is never updated or deleted. Each pull inserts a
  new immutable row with an incrementing `version` per `(entity_id, section)`. Raw JSON is
  always stored as the source-of-truth anchor.
- **Resilience:** OAuth token auto-refresh on 401; Polly retry/backoff on EDFX calls;
  structured logging of every extraction (params, http status, outcome).
- **Deployability:** single container built from a GitHub repo; config via env vars only.

## 4. Architecture (Blazor Server, layered — Option A)

One .NET 8 solution:

```
Edfx.sln
├─ Edfx.ApiClient   → OAuth token manager (auto-refresh + cache);
│                      one typed method per EDFX endpoint; Polly retries
├─ Edfx.Domain      → C# records/DTOs for every response section
├─ Edfx.Storage     → Supabase/Postgres repository; versioned inserts;
│                      raw JSON + parsed projections
└─ Edfx.Web         → Blazor Server UI: Search · Entity Dashboard · Batch ·
                       History · Uploads · Export
```

The browser talks only to the Blazor server. The server holds EDFX creds + Supabase
service key, fetches/caches the OAuth token, and is the only thing that calls EDFX or
writes to Supabase.

### 4.1 EDFX API base facts (from the User Guide)

- **Base URL:** `https://api.edfx.moodysanalytics.com/edfx/v1/`
- **Auth:** OAuth 2.0 password flow. `POST https://sso.moodysanalytics.com/sso-api/v1/token`
  with form fields `username`, `password`, `grant_type=password`, `scope=openid`.
  Response provides `id_token`; requests use header `Authorization: Bearer <id_token>`.
- **Async pattern:** some calls accept `async=true` returning 201/202 + a `processId`;
  results then polled via `/processes/{processId}/status` and fetched via `/files`.

## 5. Data model (Supabase / Postgres)

Managed via a `migrations/` SQL folder.

```
entities                      -- resolved entity directory (latest profile snapshot)
  entity_id (PK, BVDID)
  pid, orbis_id, name, country, city, industry_ndy, industry_naics, ...
  identifiers   jsonb         -- ISIN/CUSIP/LEI/ticker/tax no.
  peer_group_ids jsonb
  first_seen_at, last_seen_at

extractions                   -- the audit log: one row per section pull
  id (PK, uuid)
  entity_id (FK)
  section        text         -- 'search'|'pds'|'pds_riskcalc'|'statements'|
                              --  'ratios'|'peers_metrics'|'peers_percentile'|
                              --  'peers_metadata'|'peers_recommended'|
                              --  'risk_category'|'triggers'|'credit_limit'|'upload'
  version        int          -- per (entity_id, section), = max(version)+1 on insert
  requested_at   timestamptz
  request_params jsonb        -- exactly what we sent
  http_status    int
  status         text         -- ok | error | partial
  raw_json       jsonb        -- full EDFX response (immutable anchor)
  error_detail   text

-- Projections for the most-queried sections; each carries extraction_id (FK)
-- so it always traces back to its raw row:
pd_values         (extraction_id, entity_id, version, as_of, pd, implied_rating, term, ...)
financial_ratios  (extraction_id, entity_id, version, ratio_name, value, period, ...)
peer_metrics      (extraction_id, entity_id, version, metric, entity_value, percentile, ...)
early_warning     (extraction_id, entity_id, version, risk_category, trigger, severity, ...)
credit_limits     (extraction_id, entity_id, version, limit_amount, currency, horizon, ...)
```

Versioning makes "what did EDFX say about entity X's PD on date A vs date B" answerable —
required for PD/LGD lineage. Projection tables are derived; if a projection is wrong it can
be rebuilt from `raw_json` without data loss.

## 6. UI

- **Search page** — one box accepting a name or any identifier. Calls `/entity/v1/search`,
  shows a results grid (name, country, industry, identifiers, hasFinancials). Select →
  dashboard. Supports `limit`/`offset` paging.
- **Entity Dashboard** — header (firmographics + identifiers), then a panel per section:
  PD / RiskCalc · Financial Statements · Ratios · Peers (metrics / percentile / metadata /
  recommended) · Early Warning (risk category + triggers) · Credit Limits. Each panel:
  **[Extract]** → renders a grid + version/timestamp → result auto-saved to Supabase →
  **[Export Excel/CSV]**. An **[Extract All]** button runs every section sequentially with a
  progress list.
- **Batch page** — paste/upload a list of identifiers → resolve via `/entity/v1/mapping` →
  tick sections → run; reuses the same extractors; writes versioned rows; downloadable
  combined workbook.
- **History page** — browse/search stored extractions (by entity, section, date); re-export
  any past version; diff two versions of a section.
- **Uploads page** — download universal/bank templates; upload financials via
  `/entities/modelInputs`; poll `/processes/{id}/status`; fetch `/files`.

Export: **ClosedXML** (Excel) + CSV writer; per-section grids and a full multi-sheet entity
workbook.

## 7. Configuration & deployment

- Single GitHub repo. .NET 8 Blazor Server. `Dockerfile`. GitHub Actions builds the image.
- Secrets via env vars only: `EDFX_USERNAME`, `EDFX_PASSWORD`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_KEY`. Nothing secret committed.
- Host as one container (Render / Fly / Azure Container Apps — chosen at deploy time).
- Supabase schema via `migrations/*.sql`.

## 8. Testing

- `Edfx.ApiClient`: unit tests against recorded/mock EDFX responses (token refresh, retry,
  each endpoint's request/response mapping).
- `Edfx.Storage`: versioning logic (incrementing version per entity+section; raw JSON
  round-trip; projection rebuild).
- `Edfx.Web`: extractor orchestration (Extract All, batch) with a faked API client.
- A **mock/sandbox mode** that serves documented sample responses so the GUI is testable
  without live credentials.

## 9. Open items for the implementation plan

- Exact response field mappings per section (to be read from the User Guide appendices
  "Output Details" while building each typed client method).
- Hosting target selection (deployment-time, not blocking the build).
