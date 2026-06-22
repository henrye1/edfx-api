import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ECharts requires a real canvas (unavailable in jsdom); stub it so we can
// assert on the surrounding DOM (entity name, chart card titles, KPIs).
vi.mock('echarts-for-react', () => ({ default: () => null }))

import { EntityDetail } from '../EntityDetail/EntityDetail'
import type { EntitySummaryLive } from '../../data/search'

function mockFetch(summary: EntitySummaryLive) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => summary })) as unknown as typeof fetch)
}
afterEach(() => vi.unstubAllGlobals())

const renderAt = (id: string) => render(
  <MemoryRouter initialEntries={[`/entity/${id}`]}>
    <Routes><Route path="/entity/:id" element={<EntityDetail />} /></Routes>
  </MemoryRouter>,
)

describe('EntityDetail', () => {
  it('renders live KPIs and live trend charts when PD history is returned', async () => {
    mockFetch({
      entityId: 'ZA194602118006', name: 'The Bidvest Group Ltd', pd: 0.0019, impliedRating: 'A3',
      ews: 'Medium', ewsChange: 'Deteriorated', asOfDate: '2026-06-21', trigger: 0.026,
      pdHistory: [
        { date: '2026-05-31', pd: 0.0018, impliedRating: 'A3' },
        { date: '2026-06-21', pd: 0.0019, impliedRating: 'A3' },
      ],
    })
    renderAt('ZA194602118006')
    expect(await screen.findByText('The Bidvest Group Ltd')).toBeInTheDocument()
    expect(screen.getByText(/0\.19%/)).toBeInTheDocument() // 0.0019 -> 0.19%
    expect(screen.getByText('1-Year PiT PD vs. Trigger')).toBeInTheDocument()
    expect(screen.getByText('Implied Rating trend')).toBeInTheDocument()
  })

  it('shows live KPIs with a note (no trend charts) and back nav when no history is returned', async () => {
    mockFetch({ entityId: 'UNKNOWN123', name: 'Sibanye Stillwater', pd: 0.012, impliedRating: 'Ba1', ews: 'High', ewsChange: 'Deteriorated', asOfDate: '2026-06-21' })
    renderAt('UNKNOWN123')
    expect(await screen.findByText('Sibanye Stillwater')).toBeInTheDocument()
    expect(screen.getByText(/trend charts are unavailable/)).toBeInTheDocument()
    expect(screen.getByText('‹ Back')).toBeInTheDocument()
  })
})
