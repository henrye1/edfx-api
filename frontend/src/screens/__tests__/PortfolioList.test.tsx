import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PortfolioList } from '../PortfolioList/PortfolioList'

describe('PortfolioList', () => {
  it('renders the portfolios title and a portfolio name', async () => {
    render(<MemoryRouter><PortfolioList /></MemoryRouter>)
    expect(screen.getByText('My Portfolios')).toBeInTheDocument()
    expect(await screen.findByText('HSBC Portfolio')).toBeInTheDocument()
  })
})
