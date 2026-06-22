import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { data } from '../../data'
import type { PortfolioDetail as PD, CompanyRow, RiskDistribution } from '../../data/types'
import { KpiCard } from '../../components/KpiCard'
import { StackedDistributionBar } from '../../components/StackedDistributionBar'
import { Sparkline } from '../../components/Sparkline'
import { SegmentedTabs } from '../../components/SegmentedTabs'
import { DataTable, type Column } from '../../components/DataTable'
import { DirectionalDelta } from '../../components/DirectionalDelta'
import { RatingBadge } from '../../components/RatingBadge'
import { RiskGauge } from '../../components/RiskGauge'
import { AddCompanyDialog } from '../../components/AddCompanyDialog'
import {
  getEntitySummary, getPortfolioCompanies, addPortfolioCompany, getPortfolioName,
  type EntityHit, type PersistedCompany,
} from '../../data/search'
import { riskColor, RISK_LEVELS, type RiskLevel } from '../../tokens'

const TABS = ['All', 'With EWS', 'Need Additional Data']

const toRiskLevel = (s?: string | null): RiskLevel =>
  (RISK_LEVELS as readonly string[]).includes(s ?? '') ? (s as RiskLevel) : 'Need Additional Data'

// Derive a portfolio summary from its companies (for created portfolios with no fixture).
function deriveDetail(id: string, name: string, companies: CompanyRow[]): PD {
  const distribution: RiskDistribution = { Low: 0, Medium: 0, High: 0, Severe: 0, 'Need Additional Data': 0 }
  for (const c of companies) distribution[c.ews]++
  const pds = companies.filter((c) => c.ews !== 'Need Additional Data').map((c) => c.pd).sort((a, b) => a - b)
  const at = (q: number) => pds[Math.min(pds.length - 1, Math.floor(pds.length * q))]
  const median = pds.length ? at(0.5) : 0
  return {
    id, name, distribution, pdMedian: median, pdChangeMedianBps: 0, impliedRating: '—', trend: [], createdBy: 'You',
    companyCount: companies.length, needDataCount: distribution['Need Additional Data'],
    pdSeries: [], ratingSeries: [],
    pdDistribution: pds.length
      ? { min: pds[0], p25: at(0.25), median, p75: at(0.75), max: pds[pds.length - 1] }
      : { min: 0, p25: 0, median: 0, p75: 0, max: 0 },
    companies,
  }
}

// Persisted snapshot -> table row. Stored pd is a probability; the table shows percent.
const persistedToRow = (c: PersistedCompany): CompanyRow => ({
  id: c.entityId,
  name: c.name ?? c.entityId,
  industry: (c.industry ?? '—').toUpperCase(),
  ews: toRiskLevel(c.ews),
  ewsChange: (c.ewsChange as CompanyRow['ewsChange']) ?? 'No Change',
  pd: (c.pd ?? 0) * 100,
  pdYoYBps: 0,
  rating: c.impliedRating ?? '—',
  peerPercentile: c.peerPercentile ?? null,
})

export function PortfolioDetail() {
  const { id = '' } = useParams()
  const location = useLocation()
  const stateName = (location.state as { name?: string } | null)?.name
  const [mock, setMock] = useState<PD | undefined>()
  const [name, setName] = useState<string>('')
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('All')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoaded(false)
    Promise.all([data.getPortfolio(id), getPortfolioCompanies(id)]).then(async ([p, persisted]) => {
      const resolvedName = p?.name ?? stateName ?? (await getPortfolioName(id)) ?? 'Portfolio'
      if (!active) return
      setMock(p)
      setName(resolvedName)
      const base = p?.companies ?? []
      const persistedRows = persisted.map(persistedToRow)
      const persistedIds = new Set(persistedRows.map((r) => r.id))
      setCompanies([...persistedRows, ...base.filter((b) => !persistedIds.has(b.id))])
      setLoaded(true)
    })
    return () => { active = false }
  }, [id, stateName])

  // Mock portfolios keep their (static) fixture KPIs; created/empty ones derive from companies.
  const pf = useMemo<PD | undefined>(
    () => (loaded ? (mock ?? deriveDetail(id, name, companies)) : undefined),
    [loaded, mock, id, name, companies],
  )
  if (!pf) return null

  // On add: pull the live snapshot, persist it, then show it in the table.
  const addCompany = async (hit: EntityHit) => {
    if (companies.some((c) => c.id === hit.entityId)) return
    let summary: Awaited<ReturnType<typeof getEntitySummary>> | undefined
    try { summary = await getEntitySummary(hit.entityId) } catch { /* fall back to identity only */ }
    const payload: PersistedCompany = {
      entityId: hit.entityId,
      name: summary?.name ?? hit.internationalName ?? hit.entityId,
      industry: summary ? (hit.primaryIndustryNDYDescription ?? null) : hit.primaryIndustryNDYDescription ?? null,
      pd: summary?.pd ?? null,
      impliedRating: summary?.impliedRating ?? null,
      ews: summary?.ews ?? null,
      ewsChange: summary?.ewsChange ?? null,
      peerPercentile: null,
    }
    const persisted = await addPortfolioCompany(id, payload)
    setNotice(persisted
      ? `${payload.name} added and saved to the portfolio.`
      : `${payload.name} added for this session only — database not configured, so it won't persist.`)
    setCompanies((prev) => prev.some((c) => c.id === hit.entityId) ? prev : [persistedToRow(payload), ...prev])
  }

  const filtered = companies.filter((c) =>
    tab === 'All' ? true : tab === 'With EWS' ? c.ews !== 'Need Additional Data' : c.ews === 'Need Additional Data')

  const columns: Column<CompanyRow>[] = [
    { key: 'id', header: 'Company ID', render: (c) => c.id },
    { key: 'name', header: 'Company Name', render: (c) => <Link className="text-brand" to={`/entity/${c.id}`}>{c.name}</Link> },
    { key: 'ind', header: 'Industry', render: (c) => c.industry },
    { key: 'ews', header: 'Early Warning Signal', sortValue: (c) => c.ews,
      render: (c) => <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: riskColor(c.ews) }} />{c.ews}</span> },
    { key: 'ewschg', header: 'EWS Change', render: (c) => <span className={c.ewsChange === 'Deteriorated' ? 'text-bad' : c.ewsChange === 'Improved' ? 'text-good' : 'text-muted'}>{c.ewsChange}</span> },
    { key: 'pd', header: '1-Year PD', sortValue: (c) => c.pd, render: (c) => c.ews === 'Need Additional Data' ? '—' : `${c.pd.toFixed(2)}%` },
    { key: 'yoy', header: 'YoY (bps)', sortValue: (c) => c.pdYoYBps, render: (c) => c.ews === 'Need Additional Data' ? <span className="text-muted">—</span> : <DirectionalDelta bps={c.pdYoYBps} /> },
    { key: 'rating', header: 'Rating', render: (c) => <RatingBadge value={c.rating} /> },
    { key: 'peer', header: 'Peer Distribution', render: (c) => <RiskGauge percentile={c.peerPercentile} /> },
  ]

  return (
    <div>
      <Link to="/" className="text-xs text-brand">‹ Return to My Portfolios</Link>
      <div className="my-1 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">☰ {pf.name.toUpperCase()}</h1>
        <div className="flex gap-2">
          <button className="rounded-full border border-brand px-4 py-1.5 text-xs text-brand">Download ▾</button>
          <AddCompanyDialog onAdd={addCompany} existingIds={new Set(companies.map((c) => c.id))} />
        </div>
      </div>
      <div className="mb-3 text-[11px] text-[#9aa0ab]">👤 Owner · 🔒 Just me</div>

      {notice && (
        <div className="mb-3 rounded-lg bg-[#eef2ff] px-3 py-2 text-xs text-ink">{notice}</div>
      )}

      <div className="mb-3.5 flex flex-wrap gap-3.5">
        <KpiCard title="Early Warning Signal Distribution">
          <div className="my-1 text-[13px]">{pf.companyCount} Companies | {pf.needDataCount} need data</div>
          <StackedDistributionBar distribution={pf.distribution} />
        </KpiCard>
        <KpiCard title="1-Year PD (Median)" hero={`${pf.pdMedian.toFixed(2)}%`}
          pills={[{ label: `${pf.pdChangeMedianBps} bps (YoY)`, tone: pf.pdChangeMedianBps < 0 ? 'good' : 'bad' }]}>
          <div className="mt-1"><Sparkline points={pf.pdSeries} width={160} height={28} /></div>
        </KpiCard>
        <KpiCard title="PD Implied Rating (Median)" hero={pf.impliedRating} />
        <KpiCard title="Portfolio PD Distribution">
          <div className="mt-3 text-[11px] text-muted">
            Min {pf.pdDistribution.min}% · 25th {pf.pdDistribution.p25}% · Median {pf.pdDistribution.median}% · 75th {pf.pdDistribution.p75}% · Max {pf.pdDistribution.max}%
          </div>
        </KpiCard>
      </div>

      <div className="rounded-card bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-3">
          <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
          <span className="ml-auto text-xs text-muted">Filter by: EWS Change ▾</span>
        </div>
        <DataTable columns={columns} rows={filtered} rowKey={(c) => c.id} checkbox />
        <div className="mt-2.5 text-right text-[11px] text-muted">Items per page: 10 ▾ &nbsp; 1–{filtered.length} of {companies.length} &nbsp; ‹ ›</div>
      </div>
    </div>
  )
}
