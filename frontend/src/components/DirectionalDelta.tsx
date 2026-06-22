import clsx from 'clsx'
import { deltaDirection } from '../tokens'

export function DirectionalDelta({ bps }: { bps: number }) {
  const dir = deltaDirection(bps)
  const cls = dir === 'down' ? 'text-good' : dir === 'up' ? 'text-bad' : 'text-muted'
  const glyph = dir === 'down' ? '▼' : dir === 'up' ? '▲' : '—'
  const mag = Math.abs(bps)
  return (
    <span className={clsx('font-semibold', cls)}>
      {glyph} {dir === 'flat' ? '' : mag}
    </span>
  )
}
