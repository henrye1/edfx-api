const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function RiskGauge({ percentile }: { percentile: number | null }) {
  if (percentile == null) return <span className="text-xs text-muted">N/A</span>
  return (
    <div className="min-w-[90px]">
      <div className="mb-1 text-xs text-ink">{ordinal(percentile)}</div>
      <div className="relative h-2 rounded-full"
        style={{ background: 'linear-gradient(90deg,#5BA847,#F2C94C,#F2994A,#D64545)' }}>
        <span data-marker className="absolute -top-0.5 h-3 w-[3px] rounded bg-ink"
          style={{ left: `${percentile}%` }} />
      </div>
    </div>
  )
}
