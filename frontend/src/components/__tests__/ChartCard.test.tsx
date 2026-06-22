import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChartCard } from '../ChartCard'

describe('ChartCard', () => {
  it('renders title, ranges and fires onRangeChange', async () => {
    const onRange = vi.fn()
    render(<ChartCard title="PD vs Trigger" ranges={['1Y', '2Y', 'All']} activeRange="1Y" onRangeChange={onRange}><div>chart</div></ChartCard>)
    expect(screen.getByText('PD vs Trigger')).toBeInTheDocument()
    await userEvent.click(screen.getByText('2Y'))
    expect(onRange).toHaveBeenCalledWith('2Y')
  })
})
