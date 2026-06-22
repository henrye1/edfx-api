import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Sparkline } from '../Sparkline'

const pts = [{ date: 'a', value: 1 }, { date: 'b', value: 0.5 }]

describe('Sparkline', () => {
  it('colors green when the series falls (improving)', () => {
    const { container } = render(<Sparkline points={pts} />)
    expect(container.querySelector('polyline')?.getAttribute('stroke')).toBe('#3F8F3F')
  })
  it('colors red when the series rises (deteriorating)', () => {
    const { container } = render(<Sparkline points={[{ date: 'a', value: 0.5 }, { date: 'b', value: 1 }]} />)
    expect(container.querySelector('polyline')?.getAttribute('stroke')).toBe('#D64545')
  })
})
