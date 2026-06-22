import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from '../KpiCard'

describe('KpiCard', () => {
  it('renders title, hero, pills and as-of', () => {
    render(<KpiCard title="1-Year PD (Median)" hero="0.49%" pills={[{ label: '-9 bps (YoY)', tone: 'good' }]} asOf="Jun 1, 2026" />)
    expect(screen.getByText('1-Year PD (Median)')).toBeInTheDocument()
    expect(screen.getByText('0.49%')).toBeInTheDocument()
    expect(screen.getByText('-9 bps (YoY)')).toBeInTheDocument()
    expect(screen.getByText(/As of Jun 1, 2026/)).toBeInTheDocument()
  })
})
