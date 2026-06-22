import type { EntityDetail, SeriesPoint } from '../types'

const m = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']
const s = (vals: number[]): SeriesPoint[] => vals.map((v, i) => ({ date: m[i], value: v }))
const RATING_SCALE = ['Aaa','Aa1','Aa2','Aa3','A1','A2','A3','Baa1','Baa2','Baa3','Ba1','Ba2','Ba3','B1','B2','B3']

export const ENTITIES: Record<string, EntityDetail> = {
  ZA194602118006: {
    id: 'ZA194602118006', name: 'The Bidvest Group Ltd', version: 'V.1.0',
    meta: [
      { label: 'Company ID', value: 'ZA194602118006' },
      { label: 'Type', value: 'Private' },
      { label: 'Model', value: 'RiskCalc (Europe 4.0 Large Firm)' },
      { label: 'Data Source', value: 'Orbis' },
      { label: 'Financial Statement', value: '2025-12' },
      { label: 'Domestic Ultimate Owner', value: 'Bidvest Group Ltd', link: true },
    ],
    analysisDate: 'June 1, 2026',
    peerGroup: 'SOUTH AFRICA NDY – BUSINESS SERVICES UNLISTED',
    kpis: [
      { title: '1-Year PiT PD & Implied Rating', heroValue: '0.20% | A3', pills: [{ label: '+12 bps YoY', tone: 'bad' }, { label: '-3 Notches YoY', tone: 'bad' }], asOf: 'Jun 1, 2026' },
      { title: '1-Year PiT PD Peer Group Median', heroValue: '0.31%', pills: [], asOf: 'Jun 1, 2026' },
      { title: 'Peer Group Implied Rating Median', heroValue: 'Baa1', pills: [], asOf: 'Jun 1, 2026' },
      { title: 'Early Warning Signal', heroValue: 'Medium', pills: [{ label: 'Deteriorated', tone: 'bad' }], asOf: 'Jun 1, 2026' },
    ],
    ews: 'Medium',
    pdVsTrigger: {
      pd: s([0.14,0.15,0.15,0.16,0.17,0.17,0.18,0.18,0.19,0.19,0.20,0.20]),
      trigger: s([0.26,0.26,0.26,0.26,0.26,0.26,0.26,0.26,0.26,0.26,0.26,0.26]),
    },
    ratingTrend: s([4,4,4,5,5,5,6,6,6,6,6,6]), // notch indices into ratingScale
    ratingScale: RATING_SCALE,
    ewsQuadrant: [
      { label: 'Q3 2025', x: -1.2, y: 0.4 },
      { label: 'Q4 2025', x: -0.5, y: 0.9 },
      { label: 'Q1 2026', x: 0.3, y: 1.1 },
      { label: 'Jun 2026 (Current)', x: 0.8, y: 1.4, current: true },
    ],
    peerPercentile: {
      company: s([0.14,0.15,0.15,0.16,0.17,0.17,0.18,0.18,0.19,0.19,0.20,0.20]),
      p90: s([0.80,0.80,0.81,0.82,0.83,0.83,0.84,0.84,0.85,0.85,0.86,0.86]),
      p75: s([0.50,0.50,0.51,0.52,0.52,0.53,0.53,0.54,0.54,0.55,0.55,0.56]),
      p50: s([0.30,0.30,0.30,0.31,0.31,0.31,0.31,0.31,0.31,0.31,0.31,0.31]),
      p25: s([0.12,0.12,0.12,0.12,0.13,0.13,0.13,0.13,0.13,0.13,0.13,0.13]),
    },
  },
}
