import clsx from 'clsx'
import type { ReactNode } from 'react'

export function ChartCard({ title, info, ranges, activeRange, onRangeChange, children }:
  { title: string; info?: string; ranges?: string[]; activeRange?: string; onRangeChange?: (r: string) => void; children: ReactNode }) {
  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink">{title}{info && <span title={info} className="ml-1 text-muted">ⓘ</span>}</div>
        <div className="text-muted">⬇ ⤢</div>
      </div>
      {ranges && (
        <div className="mt-1 flex gap-2 text-[11px] text-muted">
          {ranges.map((r) => (
            <button key={r} onClick={() => onRangeChange?.(r)} className={clsx(r === activeRange && 'font-semibold text-brand')}>{r}</button>
          ))}
        </div>
      )}
      <div className="mt-2">{children}</div>
    </div>
  )
}
