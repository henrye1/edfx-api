import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PortfolioDetail } from '../PortfolioDetail/PortfolioDetail'

describe('PortfolioDetail', () => {
  it('renders KPI cards and the company table', async () => {
    render(<MemoryRouter initialEntries={['/portfolio/hsbc']}>
      <Routes><Route path="/portfolio/:id" element={<PortfolioDetail />} /></Routes>
    </MemoryRouter>)
    expect(await screen.findByText('The Bidvest Group Ltd')).toBeInTheDocument()
    expect(screen.getByText(/1-Year PD \(Median\)/)).toBeInTheDocument()
  })
})
