import type { SeriesPoint } from '../data/types'

export function lineVsTriggerOption({ pd, trigger }: { pd: SeriesPoint[]; trigger: SeriesPoint[] }) {
  return {
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: pd.map((p) => p.date) },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
      { name: '1Y PiT PD', type: 'line', smooth: true, showSymbol: false, data: pd.map((p) => p.value), lineStyle: { color: '#2563EB' }, itemStyle: { color: '#2563EB' } },
      { name: 'Trigger', type: 'line', showSymbol: false, data: trigger.map((p) => p.value), lineStyle: { color: '#D64545', type: 'dashed' } },
    ],
  }
}
