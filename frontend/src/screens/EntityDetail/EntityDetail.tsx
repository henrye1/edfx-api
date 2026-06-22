import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { data } from '../../data'
import type { EntityDetail as ED } from '../../data/types'
import { getEntitySummary, type EntitySummaryLive } from '../../data/search'
import { EntitySubNav } from '../../components/chrome/EntitySubNav'
import { KpiCard } from '../../components/KpiCard'
import { ChartCard } from '../../components/ChartCard'
import { lineVsTriggerOption } from '../../charts/lineVsTrigger'
import { steppedRatingOption } from '../../charts/steppedRating'
import { ewsQuadrantOption } from '../../charts/ewsQuadrant'
import { percentileLinesOption } from '../../charts/percentileLines'

const RANGES = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', 'All']

type Tone = 'good' | 'bad' | 'neutral'
const ewsTone = (change?: string | null): Tone =>
  change === 'Deteriorated' ? 'bad' : change === 'Improved' ? 'good' : 'neutral'
const pct = (pd?: number | null) => (pd == null ? '—' : `${(pd * 100).toFixed(2)}%`)

export function EntityDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<EntitySummaryLive | undefined>()
  const [mock, setMock] = useState<ED | undefined>() // chart series (only some entities)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [range, setRange] = useState('1Y')

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    Promise.all([getEntitySummary(id, controller.signal), data.getEntity(id)])
      .then(([s, m]) => { setSummary(s); setMock(m); setStatus('ready') })
      .catch((err) => { if (err.name !== 'AbortError') setStatus('error') })
    return () => controller.abort()
  }, [id])

  const BackBar = (
    <div className="mb-3 flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="text-xs text-brand">‹ Back</button>
      <Link to="/" className="text-xs text-muted">My Portfolios</Link>
    </div>
  )

  if (status === 'loading') return <div>{BackBar}<div className="text-sm text-muted">Loading live data…</div></div>

  if (status === 'error') {
    return (
      <div>
        {BackBar}
        <div className="rounded-card bg-card p-6 shadow-card">
          <div className="text-base font-semibold text-ink">Couldn't load live data</div>
          <p className="mt-2 max-w-prose text-sm text-muted">
            The EDF-X API didn't respond for <b className="text-ink">{id}</b>. Make sure the .NET
            app is running (it serves <code>/api/entities/{'{'}id{'}'}/summary</code>), then retry.
          </p>
        </div>
      </div>
    )
  }

  const name = summary?.name ?? mock?.name ?? id

  // KPI cards built from live EDF-X data.
  const heroPdRating = `${pct(summary?.pd)}${summary?.impliedRating ? ` | ${summary.impliedRating}` : ''}`

  return (
    <div>
      {BackBar}
      <div className="text-xl font-bold text-ink">
        {name} <span className="ml-1 rounded-md bg-[#eef2ff] px-1.5 py-0.5 text-[11px] text-brand">Live ⓘ</span>
      </div>
      <div className="my-1.5 text-[11px] text-[#9aa0ab]">
        Company ID <b className="text-ink">{id}</b>
        {summary?.asOfDate ? <> · As of <b className="text-ink">{summary.asOfDate}</b></> : null}
      </div>

      <div className="flex gap-4">
        <EntitySubNav active="Summary" />
        <div className="flex-1">
          <div className="mb-3.5 flex flex-wrap gap-3">
            <KpiCard title="1-Year PiT PD & Implied Rating" hero={heroPdRating} asOf={summary?.asOfDate ?? undefined} />
            <KpiCard title="Early Warning Signal" hero={summary?.ews ?? '—'} asOf={summary?.asOfDate ?? undefined}
              pills={summary?.ewsChange ? [{ label: summary.ewsChange, tone: ewsTone(summary.ewsChange) }] : []} />
          </div>

          {mock ? (
            <>
              <div className="mb-2 text-[11px] text-muted">Charts below are illustrative (historical series not yet wired to live EDF-X).</div>
              <div className="mb-3">
                <ChartCard title="1-Year PiT PD vs. Trigger" info="PiT PD against the peer trigger level"
                  ranges={RANGES} activeRange={range} onRangeChange={setRange}>
                  <ReactECharts option={lineVsTriggerOption(mock.pdVsTrigger)} style={{ height: 220 }} />
                </ChartCard>
              </div>
              <div className="mb-3 flex gap-3">
                <div className="flex-1">
                  <ChartCard title="Implied Rating trend">
                    <ReactECharts option={steppedRatingOption(mock.ratingTrend, mock.ratingScale)} style={{ height: 220 }} />
                  </ChartCard>
                </div>
                <div className="flex-1">
                  <ChartCard title="Early Warning Signal">
                    <ReactECharts option={ewsQuadrantOption(mock.ewsQuadrant)} style={{ height: 220 }} />
                  </ChartCard>
                </div>
              </div>
              <ChartCard title="1-Year PD Peer Group Percentile" ranges={RANGES} activeRange={range} onRangeChange={setRange}>
                <ReactECharts option={percentileLinesOption(mock.peerPercentile)} style={{ height: 240 }} />
              </ChartCard>
            </>
          ) : (
            <div className="rounded-card bg-card p-6 shadow-card text-sm text-muted">
              Live KPIs shown above. Historical trend charts (PD vs. trigger, implied-rating, early-warning
              quadrant, peer percentiles) need time-series data and aren't wired to live EDF-X in this build.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
