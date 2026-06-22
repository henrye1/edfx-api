# EDF-X UI — Design Spec

**Date:** 2026-06-22
**Status:** Approved (design); pending implementation plan
**Author:** Henry + Claude

## 1. Goal

Build a web UI that closely mirrors Moody's Analytics EDF-X: a data-dense
credit-risk analytics application built around three primary screens — a
**portfolio list**, a **portfolio detail dashboard**, and a **company (entity)
detail dashboard**. The aesthetic is clean corporate-financial: a deep navy top
bar, light-grey app background, white rounded card panels, generous whitespace,
a restrained blue accent, and a fixed risk-color semantic palette.

This first deliverable is a **standalone, mock-data-driven front end** covering
all three screens plus the shared design system and reusable component library.
Live data wiring is explicitly out of scope for this build (see §11).

## 2. Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Stack | New **React 18 + TypeScript** SPA (Vite) |
| Styling | **Tailwind CSS + Radix UI** primitives (shadcn/ui approach) — not MUI |
| Charts | **ECharts** via `echarts-for-react` |
| Routing | **React Router** |
| State | Local hooks only — no Redux/Zustand |
| Data | **Mock/fixture data first**, behind a swappable provider interface |
| Scope | Shared design system + **all three screens** |
| Location | New `frontend/` directory in this repo (monorepo alongside `src/`) |

The .NET solution is untouched by this build. The Vite dev server runs
independently (`npm run dev` in `frontend/`).

## 3. Architecture

```
frontend/
  index.html
  package.json, vite.config.ts, tsconfig.json, tailwind.config.ts
  src/
    main.tsx, App.tsx, router.tsx
    tokens/            # color/spacing/type tokens; Tailwind theme extension
    data/
      types.ts         # domain view-model types (Portfolio, Company, Entity, …)
      DataProvider.ts   # interface: getPortfolios/getPortfolio/getEntity/…
      MockDataProvider.ts
      fixtures/         # realistic mock data (Bidvest et al.)
      index.ts          # exports the active provider (mock for now)
    components/         # reusable, presentation-only
      StackedDistributionBar.tsx
      RiskGauge.tsx
      ChangePill.tsx
      DirectionalDelta.tsx
      Sparkline.tsx
      KpiCard.tsx
      ChartCard.tsx
      RatingBadge.tsx
      SegmentedTabs.tsx
      DataTable.tsx
      chrome/ TopBar.tsx, IconRail.tsx, EntitySubNav.tsx
    charts/            # ECharts option builders
      lineVsTrigger.ts, steppedRating.ts, ewsQuadrant.ts,
      percentileLines.ts, boxPlot.ts, gauge.ts, sparkline.ts
    screens/
      PortfolioList/ , PortfolioDetail/ , EntityDetail/
```

**Data flow.** Screens never import fixtures directly. They call the active
`DataProvider` (mock today). All data is shaped as **view models** in
`data/types.ts` — already aggregated/derived for display (e.g. a portfolio
carries its EWS distribution counts and PD-median series). This keeps screens
declarative and makes a future `ApiDataProvider` a drop-in replacement.

**Isolation.** Each reusable component is presentation-only: props in, markup
out, no data fetching. Risk-semantic logic (color mapping, ± direction) lives in
small pure helpers in `tokens/` so it is testable and used consistently.

## 4. Design Tokens

### Color
| Token | Value | Use |
|---|---|---|
| `navy` | `#0E1F66` | top bar |
| `bg` | `#F0F1F3` | app background |
| `card` | `#FFFFFF` | panels |
| `blue` | `#2563EB` | primary actions, links, active states |
| `text` | `#1A1A2E` | primary text |
| `muted` | `#6B7280` | secondary text |

### Risk semantic palette (fixed)
| Level | Color |
|---|---|
| Low | `#5BA847` |
| Medium | `#F2C94C` |
| High | `#F2994A` |
| Severe | `#D64545` |
| Need Additional Data | `#C4C9D1` |

Directional indicators: **down arrow / green = improvement**; **up arrow / red
= deterioration**. Status text: "Deteriorated" (red), "Improved" (green), "No
Change" (neutral grey). Hex values are screenshot approximations; exact values
may be refined against live computed styles during the build.

### Typography
Inter (substitute for Moody's licensed brand font). Page titles ~28px bold;
card titles ~16–18px semibold; KPI hero values ~32–40px bold; table body ~14px;
labels/captions ~12px muted.

### Shape & spacing
8px spacing grid. Cards: 12–16px radius, soft low-opacity shadow, ~24px internal
padding, 16–24px gaps. Buttons and tabs are fully pill-shaped.

## 5. Global Chrome

- **TopBar** (fixed, navy, ~64px): "MOODY'S | EDF-X" wordmark (left); large
  pill-shaped global search (center); teal→purple gradient "EDF-X Navigator"
  pill button; right cluster — help "?", circular avatar with initials, name +
  email stacked, dropdown chevron, 9-dot app-grid icon.
- **IconRail** (fixed, ~56px, light): monochrome icon stack — portfolios/list
  (active = boxed/highlighted), filter/sliders, upload, analytics/trend, alerts
  (bell), settings/gear. Active icon emphasized in blue.
- Main content area scrolls beneath the fixed bar and rail.

## 6. Screen 1 — My Portfolios (list)

Header: large "My Portfolios" title (left); primary pill "+ New Portfolio"
(top-right). One white card holds the table.

Card toolbar: pill search "Search for a Portfolio by Name" with clear (×);
"ⓘ Legend" link (right) → popover listing the five risk levels + swatches.

**Table columns:** row checkbox; Portfolio Name (blue link); **Early Warning
Signal Distribution (By Company Count)** — `StackedDistributionBar` with a
per-segment count legend (e.g. "43 / 5 / 11 / 51 / 3"); 1-Year PD Median (%);
1-Year PD Change Median (bps) with colored `DirectionalDelta`; 1-Year PD Median
Implied Rating (`RatingBadge`, e.g. B3/Ba3/Baa3); 12-Month Trend PD Median
(`Sparkline`, auto green/red); Created By. Sortable headers show a sort arrow;
zebra striping; hover highlight; horizontal scroll on narrow widths.

## 7. Screen 2 — Portfolio Detail

Top: "‹ Return to My Portfolios" back link; portfolio title with hamburger icon
(e.g. "HSBC PORTFOLIO"); metadata row — Owner (person icon), visibility
("🔒 Just me"). Top-right: "Download ▾" (outlined blue) and "Add Company ▾"
(filled blue).

**KPI summary cards** (responsive wrapping row of `KpiCard`s):
- Early Warning Signal Distribution — "N Companies | X need additional data",
  thin `StackedDistributionBar`, count legend.
- 1-Year PD (Median) — `Sparkline` with date-axis labels (e.g. 06.2025 →
  06.2026), large value (e.g. "0.49%"), `ChangePill` ("-9 bps (YoY)").
- PD Implied Rating (Median) — sparkline-style line + large rating value (e.g.
  "Baa3").
- Portfolio PD Distribution — horizontal box-plot/range strip with tick values
  and labels Min / 25th / Median / 75th / Max.

**Company table** (own card): left `SegmentedTabs` — "All" (active blue) / "With
EWS" / "Need Additional Data"; a "Filter by: EWS Change ▾" dropdown; search with
clear. **Columns:** checkbox; Company ID; Company Name (link); Industry
(uppercase); Early Warning Signal (color dash + label) — default sort; Early
Warning Signal Change (colored text); 1-Year PD (%); 1-Year PD YoY Change (bps)
with colored `DirectionalDelta` (▲ red / ▼ green / — neutral); PD Implied Rating;
PD Peer Distribution — `RiskGauge` (gradient strip + marker) with a percentile
label above (e.g. "7th", "24th"), or "N/A". Footer: pagination — "Items per
page: 10 ▾", range readout ("1 – 10 of 20"), prev/next chevrons.

## 8. Screen 3 — Company (Entity) Detail

**Entity header block:** large company name + version chip ("V.1.0 ⓘ" with
version-history popover). Metadata strip of bold-label / value pairs: Company ID,
Type (e.g. Private), Model (e.g. "RiskCalc (Europe 4.0 Large Firm)"), Data
Source (e.g. Orbis), Financial Statement (date), Domestic Ultimate Owner (blue
entity link). Several labels carry ⓘ tooltips.

**Control row:** "Analysis Date: June 1, 2026 ▾" pill dropdown; peer-group
dropdown (e.g. "DENMARK NDY – BUSINESS SERVICES UNLISTED ▾"); "⋮ Actions" menu.

**EntitySubNav** (secondary white sidebar): Summary (active), Company Profile,
Credit Risk (expandable → Drivers, Term Structure, Historical Trend, Qualitative
Overlay, Parent/Group Support), Financials (expandable), Instruments
(expandable), What If, Credit Sentiment Score. Active item: light highlight +
blue accent; expandable items show a chevron. **Only the Summary view is built
in this deliverable**; other sub-nav items render a styled "Coming soon"
placeholder (see §11).

**Summary content:**
- Row of `KpiCard`s, each with title, hero value, YoY `ChangePill`(s), and an
  "As of [date]" caption: "1-Year PiT PD & Implied Rating" (e.g. "0.20% | A3"
  with "+12 bps YoY" red pill and "-3 Notches YoY" red pill), "1-Year PiT PD
  Peer Group Median", "Peer Group Implied Rating Median", "Early Warning Signal"
  (e.g. "Medium" + "Deteriorated" pill).
- "Scenario Conditioning ▾" dropdown above the chart area.
- **Chart panels** (`ChartCard`: title, ⓘ, top-right download/expand icons):
  1. **1-Year PiT PD vs. Trigger** — line chart, range selector (3M/6M/1Y(active)/
     2Y/3Y/5Y/All), "From/To" date range picker.
  2. **Implied Rating trend** — stepped line, rating notation Y axis (Aa3,
     A1, A2…), month X axis.
  3. **Early Warning Signal** — quadrant/scatter with status pill ("MEDIUM"),
     explanatory sentence, "Deteriorating →" axis label, points labeled by
     period ("Jun 2026 (Current)", "Q4 2025"), "How is the early warning signal
     calculated? ⓘ" link.
  4. **1-Year PD Peer Group Percentile** — multi-line chart, percentile badge,
     range selector + date picker, legend: Company / 90th / 75th / 50th / 25th.
- PD Drivers section placeholder follows below.

## 9. Reusable Components

`StackedDistributionBar` (segments + count legend) · `RiskGauge` (gradient strip
+ marker + percentile label) · `ChangePill` (value + colored bg, ± variants) ·
`DirectionalDelta` (number + colored up/down/flat arrow) · `Sparkline` (auto
green/red) · `KpiCard` (title / hero / change pill / "as of" / optional ⓘ) ·
`ChartCard` (title + ⓘ + download/expand + range selector + date picker) ·
`RatingBadge` (Moody's notation) · `SegmentedTabs` (pill control) · `DataTable`
(sortable headers, checkbox column, zebra rows, horizontal scroll, sticky
pagination footer) · chrome: `TopBar`, `IconRail`, `EntitySubNav`.

## 10. Layout & Responsiveness

Fixed top bar (~64px) and fixed left icon rail; main content scrolls. KPI cards
use a responsive flex/grid row that wraps. Tables sit in a horizontal-scroll
container below a min width. Maintain the 8px grid, card radius, and the
navy/light-grey/white hierarchy throughout. Target desktop widths primarily
(this is an analyst tool); graceful down to ~1024px.

## 11. Out of Scope (this build)

- **Live data / API wiring.** All data is mock. A future `ApiDataProvider` will
  implement the same `DataProvider` interface. The portfolio screens require a
  backend portfolio model + aggregation endpoints that do not yet exist; the
  entity screen can later map to the validated EDF-X endpoints (PD, financials,
  peers, riskCategory, triggers).
- **Entity sub-nav pages** beyond Summary (Company Profile, Credit Risk drill-
  downs, Financials, Instruments, What If, Credit Sentiment Score) — placeholders
  only.
- **Auth / real user session**, "New Portfolio" / "Add Company" mutations,
  export/download actions (buttons are present but non-functional or stubbed).
- Deep mobile/phone optimization.

## 12. Testing

Vitest + React Testing Library. Priority coverage on the risk-logic components:
`StackedDistributionBar` (segment proportions + legend), `ChangePill` (± color
rules), `DirectionalDelta` (arrow + color by sign), `RatingBadge` (notation),
`RiskGauge` (marker position from percentile), token helpers (risk→color,
sign→direction). Screens get light smoke tests (renders, key elements present).
ECharts option builders get unit tests on the returned option object (series,
axis types) rather than pixel rendering.

## 13. Success Criteria

1. `npm run dev` in `frontend/` serves all three screens with mock data.
2. The three screens visually match the approved mockups and the EDF-X aesthetic
   (navy/grey/white, fixed risk palette, pill controls, card panels).
3. All reusable components from §9 exist, are presentation-only, and are used by
   the screens.
4. Risk-logic components and chart option builders have passing unit tests.
5. Swapping mock→live later requires implementing only `ApiDataProvider` — no
   screen or component changes.
