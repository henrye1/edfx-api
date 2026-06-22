import { useEffect, useState } from 'react'
import { getEntityFinancials, type Financials } from '../../data/search'

const humanize = (key: string) => {
  const k = key.replace(/^ratio/, '')
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()
}

const fmt = (v: unknown): string => {
  if (typeof v !== 'number') return String(v)
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return v.toFixed(3)
}

const isGroup = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function Group({ title, obj }: { title: string; obj: Record<string, unknown> }) {
  const rows = Object.entries(obj).filter(([, v]) => typeof v === 'number' || typeof v === 'string')
  if (rows.length === 0) return null
  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="mb-2 text-[13px] font-semibold text-ink">{humanize(title)}</div>
      <table className="w-full text-[13px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-[#f4f5f7] last:border-0">
              <td className="py-1.5 pr-4 text-muted">{humanize(k)}</td>
              <td className="py-1.5 text-right tabular-nums text-ink">{fmt(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, data }: { title: string; data?: Record<string, unknown> | null }) {
  if (!data) return null
  const meta = Object.entries(data).filter(([, v]) => typeof v === 'string' || typeof v === 'number')
  const groups = Object.entries(data).filter(([, v]) => isGroup(v)) as [string, Record<string, unknown>][]
  return (
    <div className="mb-4">
      <div className="mb-2 text-[15px] font-semibold text-ink">{title}</div>
      {meta.length > 0 && (
        <div className="mb-2 text-[11px] text-muted">
          {meta.map(([k, v]) => `${humanize(k)}: ${v}`).join('  ·  ')}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {groups.map(([k, v]) => <Group key={k} title={k} obj={v} />)}
      </div>
    </div>
  )
}

export function FinancialsPanel({ entityId }: { entityId: string }) {
  const [fin, setFin] = useState<Financials | undefined>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const c = new AbortController()
    setStatus('loading')
    getEntityFinancials(entityId, c.signal)
      .then((f) => { setFin(f); setStatus('ready') })
      .catch((e) => { if (e.name !== 'AbortError') setStatus('error') })
    return () => c.abort()
  }, [entityId])

  if (status === 'loading') return <div className="text-sm text-muted">Loading financials…</div>
  if (status === 'error') return <div className="rounded-card bg-card p-6 shadow-card text-sm text-bad">Couldn't load financials.</div>
  if (!fin?.statement && !fin?.ratios)
    return <div className="rounded-card bg-card p-6 shadow-card text-sm text-muted">No financial statements available for this entity.</div>

  return (
    <div>
      <Section title="Financial Statement" data={fin?.statement} />
      <Section title="Financial Ratios" data={fin?.ratios} />
    </div>
  )
}
