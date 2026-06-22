import { describe, it, expect } from 'vitest'
import { lineVsTriggerOption } from '../lineVsTrigger'
import { steppedRatingOption } from '../steppedRating'
import { ewsQuadrantOption } from '../ewsQuadrant'
import { percentileLinesOption } from '../percentileLines'
import { boxPlotOption } from '../boxPlot'

describe('chart option builders', () => {
  it('lineVsTrigger builds two series (pd + trigger)', () => {
    const opt = lineVsTriggerOption({ pd: [{ date: 'Jan', value: 0.2 }], trigger: [{ date: 'Jan', value: 0.26 }] })
    expect(opt.series).toHaveLength(2)
  })
  it('steppedRating uses a step line and category rating axis', () => {
    const opt = steppedRatingOption([{ date: 'Jan', value: 4 }], ['Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1'])
    expect(opt.series[0].step).toBe('end')
  })
  it('ewsQuadrant is a scatter with marked current point', () => {
    const opt = ewsQuadrantOption([{ label: 'Now', x: 1, y: 1, current: true }, { label: 'Q4', x: 0, y: 0 }])
    expect(opt.series[0].type).toBe('scatter')
  })
  it('percentileLines builds five series', () => {
    const z = [{ date: 'Jan', value: 0.2 }]
    const opt = percentileLinesOption({ company: z, p90: z, p75: z, p50: z, p25: z })
    expect(opt.series).toHaveLength(5)
  })
  it('boxPlot builds a boxplot series from five stats', () => {
    const opt = boxPlotOption({ min: 0.02, p25: 0.21, median: 0.49, p75: 0.93, max: 4.1 })
    expect(opt.series[0].type).toBe('boxplot')
  })
})
