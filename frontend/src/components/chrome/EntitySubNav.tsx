import clsx from 'clsx'

const ITEMS = ['Summary', 'Company Profile', 'Credit Risk', 'Financials', 'Instruments', 'What If', 'Credit Sentiment Score']
const EXPANDABLE = new Set(['Credit Risk', 'Financials', 'Instruments'])

export function EntitySubNav({ active }: { active: string }) {
  return (
    <nav className="w-44 shrink-0 text-[13px] text-[#3a4051]">
      {ITEMS.map((it) => (
        <div key={it} aria-current={it === active}
          className={clsx('rounded-lg px-2 py-1.5', it === active && 'bg-[#eef2ff] font-semibold text-brand')}>
          {it}{EXPANDABLE.has(it) && ' ▸'}
        </div>
      ))}
    </nav>
  )
}
