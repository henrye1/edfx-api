import clsx from 'clsx'

const ITEMS = [
  { key: 'portfolios', glyph: '▤' }, { key: 'filters', glyph: '⚙' },
  { key: 'upload', glyph: '⬆' }, { key: 'analytics', glyph: '📈' },
  { key: 'alerts', glyph: '🔔' }, { key: 'settings', glyph: '⚙' },
]

export function IconRail({ active }: { active: string }) {
  return (
    <nav className="fixed left-0 top-16 bottom-0 z-10 flex w-14 flex-col items-center gap-4 border-r border-[#e7e9ee] bg-card py-4 text-muted">
      {ITEMS.map((it, i) => (
        <span key={`${it.key}-${i}`} data-active={it.key === active}
          className={clsx('rounded-lg p-1.5', it.key === active && 'bg-[#eef2ff] text-brand')}>{it.glyph}</span>
      ))}
    </nav>
  )
}
