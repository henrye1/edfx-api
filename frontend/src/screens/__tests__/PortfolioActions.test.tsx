import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('echarts-for-react', () => ({ default: () => null }))

import { PortfolioList } from '../PortfolioList/PortfolioList'
import { PortfolioDetail } from '../PortfolioDetail/PortfolioDetail'

afterEach(() => vi.unstubAllGlobals())

describe('Delete / remove actions', () => {
  it('removes a company from a portfolio after confirming', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('/companies') && init?.method === 'DELETE') return { ok: true, json: async () => ({ removed: true }) }
      if (u.includes('/companies')) return { ok: true, json: async () => [{ entityId: 'E1', name: 'Test Co', industry: 'IND', pd: 0.01, impliedRating: 'Ba1', ews: 'Low', ewsChange: 'Improved' }] }
      if (/\/api\/portfolios\/[^/]+$/.test(u)) return { ok: true, json: async () => ({ name: 'Test PF' }) }
      return { ok: true, json: async () => ({}) }
    }) as unknown as typeof fetch)

    render(
      <MemoryRouter initialEntries={['/portfolio/test-1']}>
        <Routes><Route path="/portfolio/:id" element={<PortfolioDetail />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Test Co')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Remove'))
    await userEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(screen.queryByText('Test Co')).not.toBeInTheDocument())
  })

  it('deletes a persisted portfolio after confirming', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
      const u = String(url)
      if (u.endsWith('/api/portfolios') && init?.method === 'DELETE') return { ok: true, json: async () => ({}) }
      if (/\/api\/portfolios\/[^/]+$/.test(u) && init?.method === 'DELETE') return { ok: true, json: async () => ({ deleted: true }) }
      if (u.endsWith('/api/portfolios')) return { ok: true, json: async () => [{ portfolioId: 'test-1', name: 'Test PF', createdBy: 'henry', companyCount: 0, low: 0, medium: 0, high: 0, severe: 0, needData: 0, pdMedian: null }] }
      return { ok: true, json: async () => ({}) }
    }) as unknown as typeof fetch)

    render(<MemoryRouter><PortfolioList /></MemoryRouter>)
    expect(await screen.findByText('Test PF')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Delete'))
    await userEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(screen.queryByText('Test PF')).not.toBeInTheDocument())
  })
})
