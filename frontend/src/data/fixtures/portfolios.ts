import type { PortfolioDetail, PortfolioSummary, SparkPoint } from '../types'

const months = ['07.2025','08.2025','09.2025','10.2025','11.2025','12.2025',
  '01.2026','02.2026','03.2026','04.2026','05.2026','06.2026']
const spark = (vals: number[]): SparkPoint[] => vals.map((v, i) => ({ date: months[i], value: v }))

export const PORTFOLIOS: PortfolioSummary[] = [
  {
    id: 'hsbc', name: 'HSBC Portfolio',
    distribution: { Low: 43, Medium: 5, High: 11, Severe: 51, 'Need Additional Data': 3 },
    pdMedian: 0.49, pdChangeMedianBps: -9, impliedRating: 'Baa3',
    trend: spark([0.58,0.57,0.56,0.55,0.54,0.53,0.52,0.51,0.51,0.50,0.49,0.49]),
    createdBy: 'System Portfolio',
  },
  {
    id: 'sa-corp', name: 'SA Corporates',
    distribution: { Low: 20, Medium: 30, High: 25, Severe: 20, 'Need Additional Data': 5 },
    pdMedian: 1.12, pdChangeMedianBps: 14, impliedRating: 'Ba3',
    trend: spark([0.98,1.00,1.01,1.03,1.05,1.06,1.07,1.08,1.09,1.10,1.11,1.12]),
    createdBy: 'henry@anchorpointrisk.co.za',
  },
]

export const PORTFOLIO_DETAILS: Record<string, PortfolioDetail> = {
  hsbc: {
    ...PORTFOLIOS[0], companyCount: 113, needDataCount: 3,
    pdSeries: PORTFOLIOS[0].trend, ratingSeries: PORTFOLIOS[0].trend,
    pdDistribution: { min: 0.02, p25: 0.21, median: 0.49, p75: 0.93, max: 4.10 },
    companies: [
      { id: 'ZA194602118006', name: 'The Bidvest Group Ltd', industry: 'BUSINESS SERVICES', ews: 'Medium', ewsChange: 'Deteriorated', pd: 0.19, pdYoYBps: 12, rating: 'A3', peerPercentile: 24 },
      { id: 'ZA199900064407', name: 'Bidvest Freight Terminals', industry: 'LOGISTICS', ews: 'Low', ewsChange: 'Improved', pd: 0.08, pdYoYBps: -4, rating: 'A1', peerPercentile: 7 },
      { id: 'GB00231534', name: 'Bidvest Freight UK Ltd', industry: 'LOGISTICS', ews: 'High', ewsChange: 'No Change', pd: 0.74, pdYoYBps: 0, rating: 'Ba1', peerPercentile: 61 },
      { id: 'NACY19890271', name: 'Bidvest Namibia (Pty) Ltd', industry: 'BUSINESS SERVICES', ews: 'Severe', ewsChange: 'Deteriorated', pd: 2.31, pdYoYBps: 38, rating: 'B2', peerPercentile: null },
    ],
  },
  'sa-corp': {
    ...PORTFOLIOS[1], companyCount: 100, needDataCount: 5,
    pdSeries: PORTFOLIOS[1].trend, ratingSeries: PORTFOLIOS[1].trend,
    pdDistribution: { min: 0.05, p25: 0.60, median: 1.12, p75: 2.30, max: 9.80 },
    companies: [
      { id: 'ZA194602118006', name: 'The Bidvest Group Ltd', industry: 'BUSINESS SERVICES', ews: 'Medium', ewsChange: 'Deteriorated', pd: 0.19, pdYoYBps: 12, rating: 'A3', peerPercentile: 24 },
    ],
  },
}
