import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { scoreUpload, type UploadScoreResult } from '../../data/search'
import { KpiCard } from '../../components/KpiCard'
import { ChartCard } from '../../components/ChartCard'
import { RatingBadge } from '../../components/RatingBadge'
import { termStructureOption } from '../../charts/termStructure'

const pct = (pd?: number | null) => (pd == null ? '—' : `${(pd * 100).toFixed(2)}%`)
const fmt = (v?: number | null) => (v == null ? '—' : Math.abs(v) >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(3))

export function UploadScreen() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<UploadScoreResult | undefined>()
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null); setResult(undefined)
    try { setResult(await scoreUpload(file)) }
    catch { setError('Scoring request failed. Is the API running?') }
    finally { setBusy(false) }
  }

  return (
    <div>
      <h1 className="mb-1 text-[28px] font-bold text-ink">Upload &amp; Score</h1>
      <p className="mb-4 max-w-prose text-sm text-muted">
        Upload a financials file (CSV or Excel) in the EDF-X corporate template format. The data is scored
        via the modelInputs engine and returns the financial inputs (model drivers), key ratios, and both
        <b className="text-ink"> point-in-time (CCA)</b> and <b className="text-ink">through-the-cycle (FSO)</b> PDs.
      </p>

      <div className="mb-4 rounded-card bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink" />
          <button onClick={run} disabled={!file || busy}
            className="rounded-full bg-brand px-5 py-2 text-sm text-white disabled:opacity-50">
            {busy ? 'Scoring… (this can take ~30s)' : 'Score file'}
          </button>
          <a href="/api/uploads/template" className="ml-auto text-xs text-brand">⬇ Download corporate template</a>
        </div>
        {error && <div className="mt-2 text-xs text-bad">{error}</div>}
      </div>

      {result?.status === 'completed' && (
        <>
          <div className="mb-3 flex flex-wrap gap-3">
            <KpiCard title="Point-in-Time PD (CCA)" hero={pct(result.pitPd)} asOf={result.asOfDate ?? undefined} />
            <KpiCard title="Through-the-Cycle PD (FSO)" hero={pct(result.ttcPd)} asOf={result.asOfDate ?? undefined} />
            <KpiCard title="Implied Rating"><div className="mt-2"><RatingBadge value={result.impliedRating ?? '—'} /></div></KpiCard>
          </div>

          <div className="mb-3 rounded-card bg-card p-4 shadow-card">
            <div className="text-[13px] font-semibold text-ink">{result.entityName ?? 'Scored entity'}</div>
            <div className="mt-1 text-xs text-muted">{result.model ?? ''}{result.confidence ? ` · ${result.confidence}` : ''}</div>
          </div>

          {result.termStructure && result.termStructure.length > 0 && (
            <div className="mb-3">
              <ChartCard title="PD Term Structure" info="From the scored inputs">
                <ReactECharts option={termStructureOption(result.termStructure)} style={{ height: 240 }} />
              </ChartCard>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {result.ratios && result.ratios.length > 0 && (
              <div className="rounded-card bg-card p-4 shadow-card">
                <div className="mb-2 text-[13px] font-semibold text-ink">Key Ratios (derived from inputs)</div>
                <table className="w-full text-[13px]"><tbody>
                  {result.ratios.map((r) => (
                    <tr key={r.label} className="border-b border-[#f4f5f7] last:border-0">
                      <td className="py-1.5 pr-4 text-muted">{r.label}</td>
                      <td className="py-1.5 text-right tabular-nums text-ink">{fmt(r.value)}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            )}
            {result.financials?.map((g) => (
              <div key={g.group} className="rounded-card bg-card p-4 shadow-card">
                <div className="mb-2 text-[13px] font-semibold text-ink">{g.group}</div>
                <table className="w-full text-[13px]"><tbody>
                  {g.items.map((it) => (
                    <tr key={it.label} className="border-b border-[#f4f5f7] last:border-0">
                      <td className="py-1.5 pr-4 text-muted">{it.label}</td>
                      <td className="py-1.5 text-right tabular-nums text-ink">{fmt(it.value)}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            ))}
          </div>
        </>
      )}

      {(result?.status === 'failed' || result?.status === 'error') && (
        <div className="rounded-card bg-card p-5 shadow-card">
          <div className="text-sm font-semibold text-bad">Scoring {result.status}</div>
          <p className="mt-1 text-sm text-muted">{result.error ?? 'The file could not be scored.'}</p>
          <p className="mt-2 text-xs text-muted">Tip: download the corporate template above and ensure required fields (incl. <code>entityIdentifierbvd</code>, country and industry) are populated.</p>
        </div>
      )}
    </div>
  )
}
