import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ECharts requires a real canvas (unavailable in jsdom); stub it so we can
// assert on the surrounding DOM (entity name, chart card titles).
vi.mock('echarts-for-react', () => ({ default: () => null }))

import { EntityDetail } from '../EntityDetail/EntityDetail'

describe('EntityDetail', () => {
  it('renders the entity name, KPIs and chart titles', async () => {
    render(<MemoryRouter initialEntries={['/entity/ZA194602118006']}>
      <Routes><Route path="/entity/:id" element={<EntityDetail />} /></Routes>
    </MemoryRouter>)
    expect(await screen.findByText('The Bidvest Group Ltd')).toBeInTheDocument()
    expect(screen.getByText('1-Year PiT PD vs. Trigger')).toBeInTheDocument()
  })

  it('shows a graceful empty state (with back nav) for an entity without analytics', async () => {
    render(<MemoryRouter initialEntries={['/entity/UNKNOWN123']}>
      <Routes><Route path="/entity/:id" element={<EntityDetail />} /></Routes>
    </MemoryRouter>)
    expect(await screen.findByText(/No analytics available/)).toBeInTheDocument()
    expect(screen.getByText('‹ Back')).toBeInTheDocument()
    expect(screen.getByText('My Portfolios')).toBeInTheDocument()
  })
})
