import clsx from 'clsx'

export function SegmentedTabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (t: string) => void }) {
  return (
    <div className="inline-flex rounded-full bg-[#eef0f4] p-1">
      {tabs.map((t) => {
        const active = t === value
        return (
          <button key={t} role="tab" aria-selected={active} onClick={() => onChange(t)}
            className={clsx('rounded-full px-3.5 py-1.5 text-xs', active ? 'bg-brand text-white' : 'text-muted')}>
            {t}
          </button>
        )
      })}
    </div>
  )
}
