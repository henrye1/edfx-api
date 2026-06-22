import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedTabs } from '../SegmentedTabs'

describe('SegmentedTabs', () => {
  it('marks the active tab and fires onChange', async () => {
    const onChange = vi.fn()
    render(<SegmentedTabs tabs={['All', 'With EWS', 'Need Additional Data']} value="All" onChange={onChange} />)
    expect(screen.getByText('All').getAttribute('aria-selected')).toBe('true')
    await userEvent.click(screen.getByText('With EWS'))
    expect(onChange).toHaveBeenCalledWith('With EWS')
  })
})
