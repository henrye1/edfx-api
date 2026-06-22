import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { data } from '../../data'
import type { PortfolioSummary } from '../../data/types'
import { DataTable, type Column } from '../../components/DataTable'
import { StackedDistributionBar } from '../../components/StackedDistributionBar'
import { DirectionalDelta } from '../../components/DirectionalDelta'
import { RatingBadge } from '../../components/RatingBadge'
import { Sparkline } from '../../components/Sparkline'

export function PortfolioList() {
  const [rows, setRows] = useState<PortfolioSummary[]>([])
  useEffect(() => { data.getPortfolios().then(setRows) }, [])

  const columns: Column<PortfolioSummary>[] = [
    { key: 'name', header: 'Portfolio Name', sortValue: (r) => r.name,
      render: (r) => <Link className="text-brand" to={`/portfolio/${r.id}`}>{r.name}</Link> },
    { key: 'dist', header: 'Early Warning Signal Distribution',
      render: (r) => <div className="min-w-[160px]"><StackedDistributionBar distribution={r.distribution} showLegend /></div> },
    { key: 'pd', header: '1-Year PD Median', sortValue: (r) => r.pdMedian, render: (r) => `${r.pdMedian.toFixed(2)}%` },
    { key: 'chg', header: 'PD Change (bps)', sortValue: (r) => r.pdChangeMedianBps, render: (r) => <DirectionalDelta bps={r.pdChangeMedianBps} /> },
    { key: 'rating', header: 'Implied Rating', render: (r) => <RatingBadge value={r.impliedRating} /> },
    { key: 'trend', header: '12-Month Trend', render: (r) => <Sparkline points={r.trend} /> },
    { key: 'by', header: 'Created By', render: (r) => r.createdBy },
  ]

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-ink">My Portfolios</h1>
        <button className="rounded-full bg-brand px-4 py-2 text-sm text-white">+ New Portfolio</button>
      </div>
      <div className="rounded-card bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <input placeholder="Search for a Portfolio by Name" className="rounded-full bg-[#f1f2f5] px-4 py-2 text-xs text-muted" />
          <span className="text-xs text-brand">ⓘ Legend</span>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} checkbox />
      </div>
    </div>
  )
}
