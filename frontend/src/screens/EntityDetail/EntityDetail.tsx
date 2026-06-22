import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { data } from '../../data'
import type { EntityDetail as ED } from '../../data/types'
import { EntitySubNav } from '../../components/chrome/EntitySubNav'
import { KpiCard } from '../../components/KpiCard'
import { ChartCard } from '../../components/ChartCard'
import { lineVsTriggerOption } from '../../charts/lineVsTrigger'
import { steppedRatingOption } from '../../charts/steppedRating'
import { ewsQuadrantOption } from '../../charts/ewsQuadrant'
import { percentileLinesOption } from '../../charts/percentileLines'

const RANGES = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', 'All']

export function EntityDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [e, setE] = useState<ED | undefined>()
  const [loaded, setLoaded] = useState(false)
  const [range, setRange] = useState('1Y')
  useEffect(() => {
    setLoaded(false)
    data.getEntity(id).then((x) => { setE(x); setLoaded(true) })
  }, [id])

  const BackBar = (
    <div className="mb-3 flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="text-xs text-brand">‹ Back</button>
      <Link to="/" className="text-xs text-muted">My Portfolios</Link>
    </div>
  )

  if (!loaded) return <div>{BackBar}<div className="text-sm text-muted">Loading…</div></div>

  if (!e) {
    return (
      <div>
        {BackBar}
        <div className="rounded-card bg-card p-6 shadow-card">
          <div className="text-base font-semibold text-ink">No analytics available for this entity yet</div>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Entity <b className="text-ink">{id}</b> was found in EDF-X search, but its detailed
            analytics (PD, implied rating, early-warning, peers) are not loaded in this build.
            Only <b className="text-ink">The Bidvest Group Ltd</b> has a full mock profile. Wiring
            live entity analytics is the next step.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {BackBar}
      <div className="text-xl font-bold text-ink">
        {e.name} <span className="ml-1 rounded-md bg-[#eef2ff] px-1.5 py-0.5 text-[11px] text-brand">{e.version} ⓘ</span>
      </div>
      <div className="my-1.5 text-[11px] text-[#9aa0ab]">
        {e.meta.map((mm, i) => (
          <span key={i}>{mm.label} <b className={mm.link ? 'text-brand' : 'text-ink'}>{mm.value}</b>{i < e.meta.length - 1 ? ' · ' : ''}</span>
        ))}
      </div>
      <div className="mb-3 text-xs text-muted">Analysis Date: {e.analysisDate} ▾ &nbsp; {e.peerGroup} ▾ &nbsp; ⋮ Actions</div>

      <div className="flex gap-4">
        <EntitySubNav active="Summary" />
        <div className="flex-1">
          <div className="mb-3.5 flex flex-wrap gap-3">
            {e.kpis.map((k, i) => (
              <KpiCard key={i} title={k.title} hero={k.heroValue} asOf={k.asOf}
                pills={k.pills.map((p) => ({ label: p.label, tone: p.tone }))} />
            ))}
          </div>

          <div className="mb-3">
            <ChartCard title="1-Year PiT PD vs. Trigger" info="PiT PD against the peer trigger level"
              ranges={RANGES} activeRange={range} onRangeChange={setRange}>
              <ReactECharts option={lineVsTriggerOption(e.pdVsTrigger)} style={{ height: 220 }} />
            </ChartCard>
          </div>

          <div className="mb-3 flex gap-3">
            <div className="flex-1">
              <ChartCard title="Implied Rating trend">
                <ReactECharts option={steppedRatingOption(e.ratingTrend, e.ratingScale)} style={{ height: 220 }} />
              </ChartCard>
            </div>
            <div className="flex-1">
              <ChartCard title="Early Warning Signal">
                <ReactECharts option={ewsQuadrantOption(e.ewsQuadrant)} style={{ height: 220 }} />
              </ChartCard>
            </div>
          </div>

          <ChartCard title="1-Year PD Peer Group Percentile" ranges={RANGES} activeRange={range} onRangeChange={setRange}>
            <ReactECharts option={percentileLinesOption(e.peerPercentile)} style={{ height: 240 }} />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
