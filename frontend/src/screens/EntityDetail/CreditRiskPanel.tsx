import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getEntityFinancials, type EntitySummaryLive, type Financials } from '../../data/search'
import { KpiCard } from '../../components/KpiCard'
import { ChartCard } from '../../components/ChartCard'
import { termStructureOption } from '../../charts/termStructure'
import { lineVsTriggerOption } from '../../charts/lineVsTrigger'

const pct = (pd?: number | null) => (pd == null ? '—' : `${(pd * 100).toFixed(2)}%`)
const shortDate = (d?: string | null) => (d ? d.slice(0, 7) : '')
const humanize = (k: string) => k.replace(/^ratio/, '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()
const fmt = (v: unknown) => (typeof v === 'number' ? (Math.abs(v) >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(3)) : String(v))

// The financial ratio groups that act as PD drivers (RiskCalc) / financial context (CreditEdge).
const DRIVER_GROUPS = ['leverage', 'profitability', 'liquidity', 'operational', 'coverage', 'activity', 'debtCoverage']

function RatioGroup({ title, obj }: { title: string; obj: Record<string, unknown> }) {
  const rows = Object.entries(obj).filter(([, v]) => typeof v === 'number')
  if (!rows.length) return null
  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="mb-2 text-[13px] font-semibold text-ink">{humanize(title)}</div>
      <table className="w-full text-[13px]"><tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-[#f4f5f7] last:border-0">
            <td className="py-1.5 pr-4 text-muted">{humanize(k)}</td>
            <td className="py-1.5 text-right tabular-nums text-ink">{fmt(v)}</td>
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

export function CreditRiskPanel({ summary }: { summary?: EntitySummaryLive }) {
  const [fin, setFin] = useState<Financials | undefined>()
  useEffect(() => {
    if (!summary?.entityId) return
    const c = new AbortController()
    getEntityFinancials(summary.entityId, c.signal).then(setFin).catch(() => {})
    return () => c.abort()
  }, [summary?.entityId])

  const term = summary?.termStructure ?? []
  const hist = (summary?.pdHistory ?? []).filter((h) => h.date)
  const pdSeries = hist.map((h) => ({ date: shortDate(h.date), value: (h.pd ?? 0) * 100 }))
  const triggerSeries = summary?.trigger != null ? hist.map((h) => ({ date: shortDate(h.date), value: summary.trigger! * 100 })) : []

  const isRiskCalc = /riskcalc/i.test(summary?.model ?? '') || (summary?.confidence ?? '').startsWith('PF')
  const ratios = (fin?.ratios ?? {}) as Record<string, unknown>
  const driverGroups = Object.entries(ratios)
    .filter(([k, v]) => DRIVER_GROUPS.includes(k) && v && typeof v === 'object')
    .map(([k, v]) => [k, v as Record<string, unknown>] as const)

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap gap-3">
        <KpiCard title="1-Year PD" hero={pct(summary?.pd)} asOf={summary?.asOfDate ?? undefined} />
        <KpiCard title="Implied Rating" hero={summary?.impliedRating ?? '—'} asOf={summary?.asOfDate ?? undefined} />
        <KpiCard title="EWS Trigger (PD)" hero={pct(summary?.trigger)} />
      </div>

      {/* What model produced the PD */}
      <div className="mb-3 rounded-card bg-card p-4 shadow-card">
        <div className="text-[13px] font-semibold text-ink">Driving model</div>
        <p className="mt-1 text-sm text-ink">{summary?.model ?? 'Model detail unavailable.'}</p>
        {summary?.confidence && <div className="mt-1 text-[11px] text-muted">Confidence code: {summary.confidence}</div>}
      </div>

      {term.length > 0 && (
        <div className="mb-3">
          <ChartCard title="PD Term Structure" info="Cumulative & forward PD by tenor (live)">
            <ReactECharts option={termStructureOption(term)} style={{ height: 240 }} />
          </ChartCard>
        </div>
      )}

      {pdSeries.length > 1 && (
        <div className="mb-3">
          <ChartCard title="Historical PD vs. Trigger" info="Monthly PiT PD (live)">
            <ReactECharts option={lineVsTriggerOption({ pd: pdSeries, trigger: triggerSeries })} style={{ height: 220 }} />
          </ChartCard>
        </div>
      )}

      {/* PD Drivers — model-aware */}
      <div className="mb-2 rounded-card bg-card p-4 shadow-card">
        <div className="text-[15px] font-semibold text-ink">PD Drivers</div>
        <p className="mt-1 text-xs text-muted">
          {isRiskCalc
            ? 'RiskCalc derives the PD from the firm’s financial ratios below.'
            : 'CreditEdge is a market-based (structural) model — the PD is driven by the firm’s market asset value vs. its default point and asset volatility. Those market inputs aren’t exposed via this API tier, so the financial ratios below are supporting context.'}
        </p>
      </div>
      {driverGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {driverGroups.map(([k, v]) => <RatioGroup key={k} title={k} obj={v} />)}
        </div>
      ) : (
        <div className="rounded-card bg-card p-4 shadow-card text-sm text-muted">No financial driver ratios available for this entity.</div>
      )}

      <div className="mt-3 rounded-card bg-card p-4 shadow-card text-[12px] text-muted">
        Granular per-driver contribution (<code>inputData</code> / model detail) requires a detail entitlement
        not enabled on this account. Qualitative Overlay and Parent/Group Support have no EDF-X API endpoint.
      </div>
    </div>
  )
}
