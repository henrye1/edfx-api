import type { SeriesPoint } from '../data/types'

type P = { company: SeriesPoint[]; p90: SeriesPoint[]; p75: SeriesPoint[]; p50: SeriesPoint[]; p25: SeriesPoint[] }

export function percentileLinesOption(d: P) {
  const mk = (name: string, s: SeriesPoint[], color: string) =>
    ({ name, type: 'line', showSymbol: false, data: s.map((p) => p.value), lineStyle: { color }, itemStyle: { color } })
  return {
    grid: { left: 40, right: 16, top: 24, bottom: 24 },
    legend: { bottom: 0, data: ['Company', '90th', '75th', '50th', '25th'] },
    xAxis: { type: 'category', data: d.company.map((p) => p.date) },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
      mk('Company', d.company, '#2563EB'), mk('90th', d.p90, '#D64545'),
      mk('75th', d.p75, '#F2994A'), mk('50th', d.p50, '#F2C94C'), mk('25th', d.p25, '#5BA847'),
    ],
  }
}
