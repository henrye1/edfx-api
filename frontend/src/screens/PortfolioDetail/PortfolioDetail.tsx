import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { data } from '../../data'
import type { PortfolioDetail as PD, CompanyRow } from '../../data/types'
import { KpiCard } from '../../components/KpiCard'
import { StackedDistributionBar } from '../../components/StackedDistributionBar'
import { Sparkline } from '../../components/Sparkline'
import { SegmentedTabs } from '../../components/SegmentedTabs'
import { DataTable, type Column } from '../../components/DataTable'
import { DirectionalDelta } from '../../components/DirectionalDelta'
import { RatingBadge } from '../../components/RatingBadge'
import { RiskGauge } from '../../components/RiskGauge'
import { riskColor } from '../../tokens'

const TABS = ['All', 'With EWS', 'Need Additional Data']

export function PortfolioDetail() {
  const { id = '' } = useParams()
  const [pf, setPf] = useState<PD | undefined>()
  const [tab, setTab] = useState('All')
  useEffect(() => { data.getPortfolio(id).then(setPf) }, [id])
  if (!pf) return null

  const filtered = pf.companies.filter((c) =>
    tab === 'All' ? true : tab === 'With EWS' ? c.ews !== 'Need Additional Data' : c.peerPercentile == null)

  const columns: Column<CompanyRow>[] = [
    { key: 'id', header: 'Company ID', render: (c) => c.id },
    { key: 'name', header: 'Company Name', render: (c) => <Link className="text-brand" to={`/entity/${c.id}`}>{c.name}</Link> },
    { key: 'ind', header: 'Industry', render: (c) => c.industry },
    { key: 'ews', header: 'Early Warning Signal', sortValue: (c) => c.ews,
      render: (c) => <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: riskColor(c.ews) }} />{c.ews}</span> },
    { key: 'ewschg', header: 'EWS Change', render: (c) => <span className={c.ewsChange === 'Deteriorated' ? 'text-bad' : c.ewsChange === 'Improved' ? 'text-good' : 'text-muted'}>{c.ewsChange}</span> },
    { key: 'pd', header: '1-Year PD', sortValue: (c) => c.pd, render: (c) => `${c.pd.toFixed(2)}%` },
    { key: 'yoy', header: 'YoY (bps)', sortValue: (c) => c.pdYoYBps, render: (c) => <DirectionalDelta bps={c.pdYoYBps} /> },
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
          <button className="rounded-full bg-brand px-4 py-1.5 text-xs text-white">Add Company ▾</button>
        </div>
      </div>
      <div className="mb-3 text-[11px] text-[#9aa0ab]">👤 Owner · 🔒 Just me</div>

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
        <div className="mt-2.5 text-right text-[11px] text-muted">Items per page: 10 ▾ &nbsp; 1–{filtered.length} of {pf.companies.length} &nbsp; ‹ ›</div>
      </div>
    </div>
  )
}
