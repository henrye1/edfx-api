import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EntityDetail as ED } from '../../data/types'
import type { EntitySummaryLive } from '../../data/search'
import { KpiCard } from '../../components/KpiCard'
import { ChartCard } from '../../components/ChartCard'
import { lineVsTriggerOption } from '../../charts/lineVsTrigger'
import { steppedRatingOption } from '../../charts/steppedRating'
import { ewsQuadrantOption } from '../../charts/ewsQuadrant'
import { percentileLinesOption } from '../../charts/percentileLines'
import { RATING_SCALE, ratingNotch } from '../../charts/ratingScale'

const RANGES = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', 'All']
type Tone = 'good' | 'bad' | 'neutral'
const ewsTone = (c?: string | null): Tone => (c === 'Deteriorated' ? 'bad' : c === 'Improved' ? 'good' : 'neutral')
const pct = (pd?: number | null) => (pd == null ? '—' : `${(pd * 100).toFixed(2)}%`)
const shortDate = (d?: string | null) => (d ? d.slice(0, 7) : '')

export function SummaryPanel({ summary, mock }: { summary?: EntitySummaryLive; mock?: ED }) {
  const [range, setRange] = useState('1Y')
  const hist = (summary?.pdHistory ?? []).filter((h) => h.date)
  const hasHistory = hist.length > 1
  const pdSeries = hist.map((h) => ({ date: shortDate(h.date), value: (h.pd ?? 0) * 100 }))
  const triggerSeries = summary?.trigger != null ? hist.map((h) => ({ date: shortDate(h.date), value: summary.trigger! * 100 })) : []
  const ratingSeries = hist.map((h) => ({ date: shortDate(h.date), value: ratingNotch(h.impliedRating) }))
  const heroPdRating = `${pct(summary?.pd)}${summary?.impliedRating ? ` | ${summary.impliedRating}` : ''}`

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap gap-3">
        <KpiCard title="1-Year PiT PD & Implied Rating" hero={heroPdRating} asOf={summary?.asOfDate ?? undefined} />
        <KpiCard title="Early Warning Signal" hero={summary?.ews ?? '—'} asOf={summary?.asOfDate ?? undefined}
          pills={summary?.ewsChange ? [{ label: summary.ewsChange, tone: ewsTone(summary.ewsChange) }] : []} />
      </div>

      {hasHistory ? (
        <>
          <div className="mb-3">
            <ChartCard title="1-Year PiT PD vs. Trigger" info="Monthly PiT PD (live) against the current peer trigger level"
              ranges={RANGES} activeRange={range} onRangeChange={setRange}>
              <ReactECharts option={lineVsTriggerOption({ pd: pdSeries, trigger: triggerSeries })} style={{ height: 220 }} />
            </ChartCard>
          </div>
          <ChartCard title="Implied Rating trend" info="Monthly implied rating (live)">
            <ReactECharts option={steppedRatingOption(ratingSeries, RATING_SCALE)} style={{ height: 220 }} />
          </ChartCard>
        </>
      ) : (
        <div className="rounded-card bg-card p-6 shadow-card text-sm text-muted">
          Live KPIs shown above. A monthly PD/rating history wasn't returned for this entity, so the trend charts are unavailable.
        </div>
      )}

      {mock && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ChartCard title="Early Warning Signal" info="Illustrative">
            <ReactECharts option={ewsQuadrantOption(mock.ewsQuadrant)} style={{ height: 220 }} />
          </ChartCard>
          <ChartCard title="1-Year PD Peer Group Percentile" info="Illustrative">
            <ReactECharts option={percentileLinesOption(mock.peerPercentile)} style={{ height: 220 }} />
          </ChartCard>
        </div>
      )}
    </div>
  )
}
