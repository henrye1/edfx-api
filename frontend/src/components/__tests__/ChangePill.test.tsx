import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChangePill } from '../ChangePill'

describe('ChangePill', () => {
  it('applies bad tone styling', () => {
    render(<ChangePill label="+12 bps YoY" tone="bad" />)
    expect(screen.getByText('+12 bps YoY').className).toContain('text-bad')
  })
  it('applies good tone styling', () => {
    render(<ChangePill label="-9 bps" tone="good" />)
    expect(screen.getByText('-9 bps').className).toContain('text-good')
  })
})
