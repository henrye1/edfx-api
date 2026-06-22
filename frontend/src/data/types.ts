import type { RiskLevel } from '../tokens/colors'

export type ChangeStatus = 'Deteriorated' | 'Improved' | 'No Change'

/** Counts per risk level, in RISK_LEVELS order, for distribution bars. */
export interface RiskDistribution {
  Low: number; Medium: number; High: number; Severe: number; 'Need Additional Data': number
}

export interface SparkPoint { date: string; value: number }

export interface PortfolioSummary {
  id: string
  name: string
  distribution: RiskDistribution
  pdMedian: number          // percent, e.g. 0.49
  pdChangeMedianBps: number // signed bps
  impliedRating: string     // e.g. 'Baa3'
  trend: SparkPoint[]       // 12-month PD median series
  createdBy: string
}

export interface PortfolioDetail extends PortfolioSummary {
  companyCount: number
  needDataCount: number
  pdSeries: SparkPoint[]
  ratingSeries: SparkPoint[]
  pdDistribution: { min: number; p25: number; median: number; p75: number; max: number }
  companies: CompanyRow[]
}

export interface CompanyRow {
  id: string
  name: string
  industry: string
  ews: RiskLevel
  ewsChange: ChangeStatus
  pd: number                // percent
  pdYoYBps: number          // signed bps
  rating: string
  peerPercentile: number | null // 0-100, null => N/A
}

export interface EntityKpi {
  title: string
  heroValue: string
  pills: { label: string; tone: 'good' | 'bad' | 'neutral' }[]
  asOf: string
}

export interface SeriesPoint { date: string; value: number }

export interface EntityDetail {
  id: string
  name: string
  version: string
  meta: { label: string; value: string; link?: boolean }[]
  analysisDate: string
  peerGroup: string
  kpis: EntityKpi[]
  ews: RiskLevel
  pdVsTrigger: { pd: SeriesPoint[]; trigger: SeriesPoint[] }
  ratingTrend: SeriesPoint[]          // value = rating notch index (0 = best)
  ratingScale: string[]               // e.g. ['Aaa','Aa1',...] mapped to notch index
  ewsQuadrant: { label: string; x: number; y: number; current?: boolean }[]
  peerPercentile: {
    company: SeriesPoint[]; p90: SeriesPoint[]; p75: SeriesPoint[];
    p50: SeriesPoint[]; p25: SeriesPoint[]
  }
}
