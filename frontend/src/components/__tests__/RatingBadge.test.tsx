import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RatingBadge } from '../RatingBadge'

describe('RatingBadge', () => {
  it('renders the rating notation', () => {
    render(<RatingBadge value="Baa3" />)
    expect(screen.getByText('Baa3')).toBeInTheDocument()
  })
})
