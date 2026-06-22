import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('echarts-for-react', () => ({ default: () => null }))

import { PortfolioList } from '../PortfolioList/PortfolioList'
import { PortfolioDetail } from '../PortfolioDetail/PortfolioDetail'

// URL-aware fetch: portfolios list empty, create returns a new id, that portfolio has no companies.
function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url)
    if (u.endsWith('/api/portfolios') && init?.method === 'POST')
      return { ok: true, status: 200, json: async () => ({ portfolioId: 'sa-banks-ab12cd', name: 'SA Banks', persisted: true }) }
    if (u.endsWith('/api/portfolios')) return { ok: true, json: async () => [] }
    if (u.includes('/companies')) return { ok: true, json: async () => [] }
    if (/\/api\/portfolios\/[^/]+$/.test(u)) return { ok: true, json: async () => ({ portfolioId: 'sa-banks-ab12cd', name: 'SA Banks' }) }
    return { ok: true, json: async () => ({}) }
  }) as unknown as typeof fetch)
}
afterEach(() => vi.unstubAllGlobals())

describe('Create portfolio', () => {
  it('creates a portfolio and navigates to its (empty) detail page', async () => {
    stubFetch()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<PortfolioList />} />
          <Route path="/portfolio/:id" element={<PortfolioDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByText('My Portfolios')
    await userEvent.click(screen.getByText('+ New Portfolio'))
    await userEvent.type(screen.getByPlaceholderText(/SA Banks Watchlist/), 'SA Banks')
    await userEvent.click(screen.getByText('Create'))

    // Lands on the new portfolio's detail page, titled with its name.
    expect(await screen.findByText('☰ SA BANKS')).toBeInTheDocument()
    expect(screen.getByText(/Add Company/)).toBeInTheDocument()
  })
})
