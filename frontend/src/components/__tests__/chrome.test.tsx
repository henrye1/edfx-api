import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from '../chrome/TopBar'
import { IconRail } from '../chrome/IconRail'
import { EntitySubNav } from '../chrome/EntitySubNav'

describe('chrome', () => {
  it('TopBar shows wordmark and search', () => {
    render(<TopBar userName="Henry" userEmail="henry@x.co" />)
    expect(screen.getByText(/MOODY/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search by Company Name/)).toBeInTheDocument()
  })
  it('IconRail marks the active item', () => {
    const { container } = render(<IconRail active="portfolios" />)
    expect(container.querySelector('[data-active="true"]')).toBeTruthy()
  })
  it('EntitySubNav highlights the active section', () => {
    render(<EntitySubNav active="Summary" />)
    expect(screen.getByText('Summary').getAttribute('aria-current')).toBe('true')
  })
})
