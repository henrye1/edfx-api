import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { data } from '../../data'
import type { PortfolioSummary } from '../../data/types'
import { listPortfolios, type PersistedPortfolio } from '../../data/search'
import { DataTable, type Column } from '../../components/DataTable'
import { StackedDistributionBar } from '../../components/StackedDistributionBar'
import { DirectionalDelta } from '../../components/DirectionalDelta'
import { RatingBadge } from '../../components/RatingBadge'
import { Sparkline } from '../../components/Sparkline'
import { NewPortfolioDialog } from '../../components/NewPortfolioDialog'

const persistedToSummary = (p: PersistedPortfolio): PortfolioSummary => ({
  id: p.portfolioId,
  name: p.name,
  distribution: { Low: p.low, Medium: p.medium, High: p.high, Severe: p.severe, 'Need Additional Data': p.needData },
  pdMedian: (p.pdMedian ?? 0) * 100,
  pdChangeMedianBps: 0,
  impliedRating: '—',
  trend: [],
  createdBy: p.createdBy ?? 'You',
})

export function PortfolioList() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<PortfolioSummary[]>([])

  useEffect(() => {
    let active = true
    Promise.all([data.getPortfolios(), listPortfolios()]).then(([mock, persisted]) => {
      if (!active) return
      const persistedRows = persisted.map(persistedToSummary)
      const persistedIds = new Set(persistedRows.map((r) => r.id))
      // User-created portfolios first, then the demo seeds not already persisted.
      setRows([...persistedRows, ...mock.filter((m) => !persistedIds.has(m.id))])
    })
    return () => { active = false }
  }, [])

  const onCreated = (id: string, name: string, persisted: boolean) =>
    navigate(`/portfolio/${id}`, { state: { name, persisted } })

  const columns: Column<PortfolioSummary>[] = [
    { key: 'name', header: 'Portfolio Name', sortValue: (r) => r.name,
      render: (r) => <Link className="text-brand" to={`/portfolio/${r.id}`}>{r.name}</Link> },
    { key: 'dist', header: 'Early Warning Signal Distribution',
      render: (r) => <div className="min-w-[160px]"><StackedDistributionBar distribution={r.distribution} showLegend /></div> },
    { key: 'pd', header: '1-Year PD Median', sortValue: (r) => r.pdMedian,
      render: (r) => (r.pdMedian > 0 ? `${r.pdMedian.toFixed(2)}%` : '—') },
    { key: 'chg', header: 'PD Change (bps)', sortValue: (r) => r.pdChangeMedianBps, render: (r) => <DirectionalDelta bps={r.pdChangeMedianBps} /> },
    { key: 'rating', header: 'Implied Rating', render: (r) => <RatingBadge value={r.impliedRating} /> },
    { key: 'trend', header: '12-Month Trend', render: (r) => <Sparkline points={r.trend} /> },
    { key: 'by', header: 'Created By', render: (r) => r.createdBy },
  ]

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-ink">My Portfolios</h1>
        <NewPortfolioDialog onCreated={onCreated} />
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
