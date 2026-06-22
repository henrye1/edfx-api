import { RISK_LEVELS, RISK_COLORS } from '../tokens'
import type { RiskDistribution } from '../data/types'

export function StackedDistributionBar({
  distribution, showLegend = false, height = 10,
}: { distribution: RiskDistribution; showLegend?: boolean; height?: number }) {
  const total = RISK_LEVELS.reduce((sum, l) => sum + distribution[l], 0) || 1
  return (
    <div>
      <div className="flex overflow-hidden rounded-full" style={{ height }}>
        {RISK_LEVELS.map((l) => (
          <span key={l} data-seg title={`${l}: ${distribution[l]}`}
            style={{ flex: distribution[l] / total, backgroundColor: RISK_COLORS[l] }} />
        ))}
      </div>
      {showLegend && (
        <div className="mt-1.5 text-xs text-muted">
          {RISK_LEVELS.map((l) => distribution[l]).join(' / ')}
        </div>
      )}
    </div>
  )
}
