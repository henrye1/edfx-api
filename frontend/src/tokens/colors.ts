export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Severe', 'Need Additional Data'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const RISK_COLORS: Record<RiskLevel, string> = {
  'Low': '#5BA847',
  'Medium': '#F2C94C',
  'High': '#F2994A',
  'Severe': '#D64545',
  'Need Additional Data': '#C4C9D1',
}

export function riskColor(level: RiskLevel): string {
  return RISK_COLORS[level]
}

export type DeltaDirection = 'up' | 'down' | 'flat'

/** Down (improvement) for negative, up (deterioration) for positive, flat for zero. */
export function deltaDirection(bps: number): DeltaDirection {
  if (bps < 0) return 'down'
  if (bps > 0) return 'up'
  return 'flat'
}

export const PALETTE = {
  navy: '#0E1F66', appbg: '#F0F1F3', card: '#FFFFFF',
  brand: '#2563EB', ink: '#1A1A2E', muted: '#6B7280',
  good: '#3F8F3F', bad: '#D64545',
} as const
