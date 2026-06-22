import type { TermPoint } from '../data/search'

/** Cumulative & forward PD by tenor (values are probabilities → shown as %). */
export function termStructureOption(points: TermPoint[]) {
  return {
    grid: { left: 44, right: 16, top: 24, bottom: 24 },
    legend: { bottom: 0, data: ['Cumulative PD', 'Forward PD'] },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: points.map((p) => p.tenor) },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
      { name: 'Cumulative PD', type: 'line', smooth: true, showSymbol: false,
        data: points.map((p) => (p.cumulative ?? 0) * 100), lineStyle: { color: '#2563EB' }, itemStyle: { color: '#2563EB' } },
      { name: 'Forward PD', type: 'line', smooth: true, showSymbol: false,
        data: points.map((p) => (p.forward ?? 0) * 100), lineStyle: { color: '#F2994A' }, itemStyle: { color: '#F2994A' } },
    ],
  }
}
