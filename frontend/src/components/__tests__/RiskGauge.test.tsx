import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskGauge } from '../RiskGauge'

describe('RiskGauge', () => {
  it('positions marker at the percentile and shows the label', () => {
    const { container } = render(<RiskGauge percentile={24} />)
    expect(screen.getByText('24th')).toBeInTheDocument()
    const marker = container.querySelector('[data-marker]') as HTMLElement
    expect(marker.style.left).toBe('24%')
  })
  it('renders N/A when percentile is null', () => {
    render(<RiskGauge percentile={null} />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})
