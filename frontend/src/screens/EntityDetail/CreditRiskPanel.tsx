import ReactECharts from 'echarts-for-react'
import type { EntitySummaryLive } from '../../data/search'
import { KpiCard } from '../../components/KpiCard'
import { ChartCard } from '../../components/ChartCard'
import { termStructureOption } from '../../charts/termStructure'
import { lineVsTriggerOption } from '../../charts/lineVsTrigger'

const pct = (pd?: number | null) => (pd == null ? '—' : `${(pd * 100).toFixed(2)}%`)
const shortDate = (d?: string | null) => (d ? d.slice(0, 7) : '')

export function CreditRiskPanel({ summary }: { summary?: EntitySummaryLive }) {
  const term = summary?.termStructure ?? []
  const hist = (summary?.pdHistory ?? []).filter((h) => h.date)
  const pdSeries = hist.map((h) => ({ date: shortDate(h.date), value: (h.pd ?? 0) * 100 }))
  const triggerSeries = summary?.trigger != null ? hist.map((h) => ({ date: shortDate(h.date), value: summary.trigger! * 100 })) : []

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap gap-3">
        <KpiCard title="1-Year PD" hero={pct(summary?.pd)} asOf={summary?.asOfDate ?? undefined} />
        <KpiCard title="Implied Rating" hero={summary?.impliedRating ?? '—'} asOf={summary?.asOfDate ?? undefined} />
        <KpiCard title="EWS Trigger (PD)" hero={pct(summary?.trigger)} />
      </div>

      {term.length > 0 ? (
        <div className="mb-3">
          <ChartCard title="PD Term Structure" info="Cumulative & forward PD by tenor (live)">
            <ReactECharts option={termStructureOption(term)} style={{ height: 240 }} />
          </ChartCard>
        </div>
      ) : (
        <div className="mb-3 rounded-card bg-card p-6 shadow-card text-sm text-muted">PD term structure not available for this entity.</div>
      )}

      {pdSeries.length > 1 && (
        <ChartCard title="Historical PD vs. Trigger" info="Monthly PiT PD (live)">
          <ReactECharts option={lineVsTriggerOption({ pd: pdSeries, trigger: triggerSeries })} style={{ height: 220 }} />
        </ChartCard>
      )}

      <div className="mt-3 rounded-card bg-card p-4 shadow-card text-[12px] text-muted">
        <b className="text-ink">Drivers</b> (PD input detail) are supported by the API via
        <code className="mx-1">modelParameters.inputDetail</code> but are not returned for this account’s
        entitlement. <b className="text-ink">Qualitative Overlay</b> and <b className="text-ink">Parent/Group
        Support</b> have no corresponding EDF-X API endpoint.
      </div>
    </div>
  )
}
