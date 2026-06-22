import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('echarts-for-react', () => ({ default: () => null }))

import { EntityDetail } from '../EntityDetail/EntityDetail'

// URL-aware fetch: serves summary / profile / financials by path.
function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: unknown) => {
    const u = String(url)
    const body = u.includes('/profile')
      ? { entityId: 'X', internationalName: 'Sasol Ltd', ticker: 'SOL', countryName: 'South Africa' }
      : u.includes('/financials')
        ? { statement: { currency: 'ZAR', balanceSheet: { totalCurrentAssets: 53929664 } }, ratios: { leverage: { ratioTotalDebtToTotalAssets: 0.357 } } }
        : {
            entityId: 'X', name: 'Sasol Ltd', pd: 0.0102, impliedRating: 'Ba1', ews: 'Low', ewsChange: 'Improved',
            asOfDate: '2026-05-31', trigger: 0.0237,
            pdHistory: [{ date: '2026-04-30', pd: 0.0075, impliedRating: 'Ba1' }, { date: '2026-05-31', pd: 0.0102, impliedRating: 'Ba1' }],
            termStructure: [{ tenor: '1y', forward: 0.0102, cumulative: 0.0102 }, { tenor: '2y', forward: 0.02, cumulative: 0.03 }],
          }
    return { ok: true, json: async () => body }
  }) as unknown as typeof fetch)
}
afterEach(() => vi.unstubAllGlobals())

const renderEntity = () => render(
  <MemoryRouter initialEntries={['/entity/X']}>
    <Routes><Route path="/entity/:id" element={<EntityDetail />} /></Routes>
  </MemoryRouter>,
)

describe('EntityDetail sections', () => {
  it('switches to Company Profile and shows live firmographics', async () => {
    stubFetch()
    renderEntity()
    await screen.findByText('Sasol Ltd')
    await userEvent.click(screen.getByText('Company Profile'))
    expect(await screen.findByText('SOL')).toBeInTheDocument()
  })

  it('switches to Credit Risk and shows the term structure', async () => {
    stubFetch()
    renderEntity()
    await screen.findByText('Sasol Ltd')
    await userEvent.click(screen.getByText(/Credit Risk/))
    expect(await screen.findByText('PD Term Structure')).toBeInTheDocument()
  })

  it('switches to Financials and renders a ratio group', async () => {
    stubFetch()
    renderEntity()
    await screen.findByText('Sasol Ltd')
    await userEvent.click(screen.getByText(/Financials/))
    expect(await screen.findByText('Leverage')).toBeInTheDocument()
  })

  it('shows a placeholder for Instruments', async () => {
    stubFetch()
    renderEntity()
    await screen.findByText('Sasol Ltd')
    await userEvent.click(screen.getByText(/Instruments/))
    expect(await screen.findByText(/no instrument-level analytics endpoint/)).toBeInTheDocument()
    expect(screen.getByText('Not available via API')).toBeInTheDocument()
  })
})
