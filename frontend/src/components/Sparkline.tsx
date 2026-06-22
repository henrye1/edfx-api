import type { SparkPoint } from '../data/types'
import { PALETTE } from '../tokens'

export function Sparkline({ points, width = 70, height = 20 }: { points: SparkPoint[]; width?: number; height?: number }) {
  if (points.length < 2) return null
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
  const rising = vals[vals.length - 1] > vals[0]
  const stroke = rising ? PALETTE.bad : PALETTE.good
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p.value - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline points={coords} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  )
}
