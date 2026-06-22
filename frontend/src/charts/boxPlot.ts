export function boxPlotOption(d: { min: number; p25: number; median: number; p75: number; max: number }) {
  return {
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: ['PD'] },
    series: [{ type: 'boxplot', data: [[d.min, d.p25, d.median, d.p75, d.max]], itemStyle: { color: '#9aa7d6', borderColor: '#2563EB' } }],
  }
}
