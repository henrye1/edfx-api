# EDFX Extractor

An internal tool for extracting data from the [Moody's EDF-X API](https://api.edfx.moodysanalytics.com) via a Blazor web GUI, persisting every pull to Supabase/Postgres as an immutable, versioned audit record, with Excel/CSV export and entity search.

Covers all EDF-X sections:

- **PD** — best estimate, CreditEdge, RiskCalc, Payment
- **Financial statements & ratios**
- **Peers** — metrics, percentile, metadata, recommended
- **Early warning** — risk category and triggers
- **Credit limits**
- **Financial-statement upload** via processes

---

## Architecture

The solution (`Edfx.slnx`) is layered across four projects:

| Project | Role |
|---|---|
| `Edfx.Domain` | Response record types shared across layers |
| `Edfx.ApiClient` | OAuth token management, typed EDF-X endpoint client, mock implementation |
| `Edfx.Storage` | Versioned Postgres repository (Npgsql); every extract is an immutable audit record |
| `Edfx.Web` | Blazor Web App UI — entity search, extraction triggers, Excel/CSV export |

The browser never sees credentials. All EDF-X calls are proxied server-side; secrets are injected via environment variables at runtime.

---

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Docker](https://www.docker.com/) (optional — for containerised runs and integration tests)
- A [Supabase](https://supabase.com) project (for persistence in live mode)
- EDF-X API credentials from Moody's (for live mode)

---

## Configuration

All configuration is via environment variables. No secrets are stored in source control.

| Variable | Description | Required for live | Required for mock |
|---|---|---|---|
| `EDFX_USERNAME` | Moody's EDF-X portal username | Yes | No |
| `EDFX_PASSWORD` | Moody's EDF-X portal password | Yes | No |
| `EDFX_BASE_URL` | EDF-X API base URL | No (default below) | No |
| `EDFX_TOKEN_URL` | Moody's SSO token endpoint | No (default below) | No |
| `EDFX_USE_MOCK` | Set `true` to run with synthetic data — no credentials or DB required | No | Yes (set to `true`) |
| `SUPABASE_DB_CONNECTION` | Npgsql connection string to Supabase/Postgres | Yes | No |

**Defaults:**

```
EDFX_BASE_URL  = https://api.edfx.moodysanalytics.com/edfx/v1/
EDFX_TOKEN_URL = https://sso.moodysanalytics.com/sso-api/v1/token
```

---

## Run locally in mock mode

No EDF-X credentials or database needed.

**PowerShell:**
```powershell
$env:EDFX_USE_MOCK = "true"
dotnet run --project src/Edfx.Web
```

**Command Prompt / bash:**
```
set EDFX_USE_MOCK=true
dotnet run --project src/Edfx.Web
```

Browse to `http://localhost:5000` (or the port shown in the terminal output).

---

## Apply database migrations

Run the migrations once against your Supabase/Postgres instance before the first live run.

```bash
psql "$SUPABASE_DB_CONNECTION" -f migrations/001_core.sql
psql "$SUPABASE_DB_CONNECTION" -f migrations/002_projections.sql
```

### Getting the Supabase connection string

1. Open the [Supabase dashboard](https://app.supabase.com) and select your project.
2. Go to **Project Settings → Database → Connection string / URI**.
3. Choose the **direct connection** (port 5432) for local use, or the **pooled connection** (port 6543) for serverless/container hosts.
4. Format it as an Npgsql connection string, for example:

```
Host=db.xxxx.supabase.co;Port=5432;Username=postgres;Password=<your-password>;Database=postgres;SSL Mode=Require;Trust Server Certificate=true
```

Set this as `SUPABASE_DB_CONNECTION`.

---

## Run with Docker

Build the image:

```bash
docker build -t edfx-web .
```

Create a `.env` file (do **not** commit it — it is listed in `.gitignore`):

```env
EDFX_USERNAME=your-username
EDFX_PASSWORD=your-password
SUPABASE_DB_CONNECTION=Host=...;Port=5432;Username=postgres;Password=...;Database=postgres;SSL Mode=Require;Trust Server Certificate=true
EDFX_USE_MOCK=false
```

Run the container:

```bash
docker run -p 8080:8080 --env-file .env edfx-web
```

Browse to `http://localhost:8080`.

---

## Running the tests

```bash
dotnet test
```

**Storage integration tests** are skipped by default. They require a live Postgres instance pointed to by the `EDFX_TEST_DB` environment variable.

Spin up a local Postgres with Docker:

```bash
docker run -d --name edfx-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=edfx_test \
  -p 55432:5432 \
  postgres:16
```

Then set the variable and re-run:

```bash
# PowerShell
$env:EDFX_TEST_DB = "Host=localhost;Port=55432;Username=postgres;Password=postgres;Database=edfx_test"

# bash / Command Prompt
set EDFX_TEST_DB=Host=localhost;Port=55432;Username=postgres;Password=postgres;Database=edfx_test

dotnet test
```

---

## Deployment

The repository includes a `render.yaml` for one-click deployment to [Render](https://render.com) using Docker runtime.

Set the following secrets in the Render dashboard (they are marked `sync: false` in `render.yaml` and are never committed):

- `EDFX_USERNAME`
- `EDFX_PASSWORD`
- `SUPABASE_DB_CONNECTION`

`EDFX_BASE_URL`, `EDFX_TOKEN_URL`, and `EDFX_USE_MOCK` are provided as plain values in `render.yaml` and can be overridden in the dashboard if needed.
