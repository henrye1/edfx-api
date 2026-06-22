import { ChangePill } from './ChangePill'
import type { ReactNode } from 'react'

type Pill = { label: string; tone: 'good' | 'bad' | 'neutral' }

export function KpiCard({ title, hero, pills = [], asOf, children }:
  { title: string; hero?: ReactNode; pills?: Pill[]; asOf?: string; children?: ReactNode }) {
  return (
    <div className="min-w-[180px] flex-1 rounded-card bg-card p-4 shadow-card">
      <div className="text-xs text-muted">{title}</div>
      {hero != null && <div className="mt-1 text-3xl font-bold text-ink">{hero}</div>}
      {children}
      {pills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {pills.map((p, i) => <ChangePill key={i} label={p.label} tone={p.tone} />)}
        </div>
      )}
      {asOf && <div className="mt-2 text-[11px] text-[#9aa0ab]">As of {asOf}</div>}
    </div>
  )
}
