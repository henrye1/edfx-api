import type { SeriesPoint } from '../data/types'

export function steppedRatingOption(trend: SeriesPoint[], scale: string[]) {
  return {
    grid: { left: 48, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: trend.map((p) => p.date) },
    yAxis: { type: 'category', inverse: true, data: scale },
    series: [{ type: 'line', step: 'end', symbol: 'none', data: trend.map((p) => p.value), lineStyle: { color: '#2563EB' } }],
  }
}
