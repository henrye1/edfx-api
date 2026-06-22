import { useEffect, useState } from 'react'
import { getEntityFinancials, computeWhatIf, type EntitySummaryLive, type WhatIfResult } from '../../data/search'
import { KpiCard } from '../../components/KpiCard'

// Editable drivers (keys must match the modelInputs template columns).
const FIELDS = [
  { key: 'netSales', label: 'Net Sales' },
  { key: 'totalAssets', label: 'Total Assets' },
  { key: 'totalCurrentAssets', label: 'Total Current Assets' },
  { key: 'totalInventory', label: 'Total Inventory' },
  { key: 'cashAndMarketableSecurities', label: 'Cash & Marketable Securities' },
  { key: 'totalAccountsReceivable', label: 'Total Accounts Receivable' },
]

const pct = (pd?: number | null) => (pd == null ? '—' : `${(pd * 100).toFixed(2)}%`)

function findNumber(statement: Record<string, unknown> | null | undefined, key: string): number | undefined {
  if (!statement) return undefined
  for (const v of Object.values(statement)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = (v as Record<string, unknown>)[key]
      if (typeof inner === 'number') return inner
    }
  }
  const top = statement[key]
  return typeof top === 'number' ? top : undefined
}

export function WhatIfPanel({ entityId, summary }: { entityId: string; summary?: EntitySummaryLive }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<WhatIfResult | undefined>()

  useEffect(() => {
    const c = new AbortController()
    setLoadStatus('loading')
    getEntityFinancials(entityId, c.signal)
      .then((f) => {
        const init: Record<string, string> = {}
        for (const fld of FIELDS) {
          const v = findNumber(f.statement, fld.key)
          if (v != null) init[fld.key] = String(v)
        }
        setValues(init)
        setLoadStatus('ready')
      })
      .catch((e) => { if (e.name !== 'AbortError') setLoadStatus('error') })
    return () => c.abort()
  }, [entityId])

  const run = async () => {
    setRunning(true); setResult(undefined)
    const overrides: Record<string, number> = {}
    for (const [k, v] of Object.entries(values)) {
      const n = Number(v)
      if (v !== '' && !Number.isNaN(n)) overrides[k] = n
    }
    try {
      setResult(await computeWhatIf(entityId, overrides))
    } catch {
      setResult({ status: 'error', error: 'Request failed. Is the API running?' })
    } finally {
      setRunning(false)
    }
  }

  if (loadStatus === 'loading') return <div className="text-sm text-muted">Loading financials…</div>
  if (loadStatus === 'error') return <div className="rounded-card bg-card p-6 shadow-card text-sm text-bad">Couldn't load financials to seed the what-if.</div>

  return (
    <div>
      <div className="mb-3 rounded-card bg-card p-5 shadow-card">
        <div className="text-[15px] font-semibold text-ink">What-If — recompute PD from edited financials</div>
        <p className="mt-1 text-xs text-muted">
          Values are seeded from the latest reported statement. Edit any figure and recompute — EDF-X re-scores
          the entity from your inputs (RiskCalc model) via the modelInputs upload flow.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="text-[12px] text-muted">
              {f.label}
              <input type="number" value={values[f.key] ?? ''} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#e3e5e9] bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-brand" />
            </label>
          ))}
        </div>
        <button onClick={run} disabled={running}
          className="mt-4 rounded-full bg-brand px-5 py-2 text-sm text-white disabled:opacity-60">
          {running ? 'Recomputing… (this can take ~30s)' : 'Recompute PD'}
        </button>
      </div>

      {result && (
        <div className="flex flex-wrap gap-3">
          <KpiCard title="Current (reported)" hero={`${pct(summary?.pd)} | ${summary?.impliedRating ?? '—'}`} asOf={summary?.asOfDate ?? undefined} />
          {result.status === 'completed' ? (
            <KpiCard title="What-If (your inputs)" hero={`${pct(result.pd)} | ${result.impliedRating ?? '—'}`} asOf={result.asOfDate ?? undefined} />
          ) : (
            <div className="min-w-[180px] flex-1 rounded-card bg-card p-4 shadow-card">
              <div className="text-xs text-muted">What-If</div>
              <div className="mt-1 text-sm text-bad">{result.error ?? 'Calculation failed.'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
