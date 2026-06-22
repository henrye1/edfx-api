import clsx from 'clsx'
import { Link } from 'react-router-dom'

const ITEMS = [
  { key: 'portfolios', glyph: '▤', to: '/' }, { key: 'filters', glyph: '⚙' },
  { key: 'upload', glyph: '⬆' }, { key: 'analytics', glyph: '📈' },
  { key: 'alerts', glyph: '🔔' }, { key: 'settings', glyph: '⚙' },
]

export function IconRail({ active }: { active: string }) {
  return (
    <nav className="fixed left-0 top-16 bottom-0 z-10 flex w-14 flex-col items-center gap-4 border-r border-[#e7e9ee] bg-card py-4 text-muted">
      {ITEMS.map((it, i) => {
        const cls = clsx('rounded-lg p-1.5 no-underline', it.key === active ? 'bg-[#eef2ff] text-brand' : 'text-muted')
        return it.to ? (
          <Link key={`${it.key}-${i}`} to={it.to} data-active={it.key === active} className={cls} title={it.key}>{it.glyph}</Link>
        ) : (
          <span key={`${it.key}-${i}`} data-active={it.key === active} className={cls} title={it.key}>{it.glyph}</span>
        )
      })}
    </nav>
  )
}
