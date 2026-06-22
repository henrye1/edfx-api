import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StackedDistributionBar } from '../StackedDistributionBar'

const dist = { Low: 43, Medium: 5, High: 11, Severe: 51, 'Need Additional Data': 3 }

describe('StackedDistributionBar', () => {
  it('renders five segments with risk colors and a count legend', () => {
    const { container } = render(<StackedDistributionBar distribution={dist} showLegend />)
    const segs = container.querySelectorAll('[data-seg]')
    expect(segs.length).toBe(5)
    expect((segs[0] as HTMLElement).style.backgroundColor).toBe('rgb(91, 168, 71)') // #5BA847
    expect(screen.getByText('43 / 5 / 11 / 51 / 3')).toBeInTheDocument()
  })
})
