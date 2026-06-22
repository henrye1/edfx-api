import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TopBar } from '../chrome/TopBar'
import { IconRail } from '../chrome/IconRail'
import { EntitySubNav } from '../chrome/EntitySubNav'

const router = (ui: ReactNode) => <MemoryRouter>{ui}</MemoryRouter>

describe('chrome', () => {
  it('TopBar shows wordmark (linking home) and search', () => {
    render(router(<TopBar userName="Henry" userEmail="henry@x.co" />))
    expect(screen.getByText(/MOODY/).closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByPlaceholderText(/Search by Company Name/)).toBeInTheDocument()
  })
  it('IconRail marks the active item and links portfolios home', () => {
    const { container } = render(router(<IconRail active="portfolios" />))
    const active = container.querySelector('[data-active="true"]')
    expect(active).toBeTruthy()
    expect(active).toHaveAttribute('href', '/')
  })
  it('EntitySubNav highlights the active section', () => {
    render(<EntitySubNav active="Summary" />)
    expect(screen.getByText('Summary').getAttribute('aria-current')).toBe('true')
  })
  it('EntitySubNav fires onSelect when a section is clicked', async () => {
    const onSelect = vi.fn()
    render(<EntitySubNav active="Summary" onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Company Profile'))
    expect(onSelect).toHaveBeenCalledWith('Company Profile')
  })
})
