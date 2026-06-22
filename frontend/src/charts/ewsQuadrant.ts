type Pt = { label: string; x: number; y: number; current?: boolean }

export function ewsQuadrantOption(points: Pt[]) {
  return {
    grid: { left: 30, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'value', name: 'Deteriorating →', nameLocation: 'end', axisLine: { onZero: true } },
    yAxis: { type: 'value', axisLine: { onZero: true } },
    series: [{
      type: 'scatter',
      symbolSize: (_: unknown, p: { dataIndex: number }) => (points[p.dataIndex]?.current ? 14 : 9),
      data: points.map((pt) => ({ value: [pt.x, pt.y], name: pt.label, itemStyle: { color: pt.current ? '#F2C94C' : '#9aa0ab' } })),
      label: { show: true, formatter: (p: { dataIndex: number }) => points[p.dataIndex].label, position: 'right', fontSize: 10 },
    }],
  }
}
