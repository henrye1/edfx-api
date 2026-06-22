import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DirectionalDelta } from '../DirectionalDelta'

describe('DirectionalDelta', () => {
  it('shows green down arrow for negative bps', () => {
    const { container } = render(<DirectionalDelta bps={-9} />)
    expect(screen.getByText(/9/)).toBeInTheDocument()
    expect(container.querySelector('.text-good')).toBeTruthy()
  })
  it('shows red up arrow for positive bps', () => {
    const { container } = render(<DirectionalDelta bps={14} />)
    expect(container.querySelector('.text-bad')).toBeTruthy()
  })
  it('shows neutral dash for zero', () => {
    render(<DirectionalDelta bps={0} />)
    expect(screen.getByText(/—/)).toBeInTheDocument()
  })
})
