import clsx from 'clsx'

export const ENTITY_SECTIONS = [
  'Summary', 'Company Profile', 'Credit Risk', 'Financials', 'Instruments', 'What If', 'Credit Sentiment Score',
] as const
export type EntitySection = (typeof ENTITY_SECTIONS)[number]

const EXPANDABLE = new Set<EntitySection>(['Credit Risk', 'Financials', 'Instruments'])

export function EntitySubNav({ active, onSelect }: { active: EntitySection; onSelect?: (s: EntitySection) => void }) {
  return (
    <nav className="w-44 shrink-0 text-[13px] text-[#3a4051]">
      {ENTITY_SECTIONS.map((it) => (
        <button key={it} aria-current={it === active} onClick={() => onSelect?.(it)}
          className={clsx('block w-full rounded-lg px-2 py-1.5 text-left',
            it === active ? 'bg-[#eef2ff] font-semibold text-brand' : 'hover:bg-[#f4f5f7]')}>
          {it}{EXPANDABLE.has(it) && ' ▸'}
        </button>
      ))}
    </nav>
  )
}
