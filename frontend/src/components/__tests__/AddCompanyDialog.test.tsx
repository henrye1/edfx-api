import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddCompanyDialog } from '../AddCompanyDialog'

describe('AddCompanyDialog', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ total: 1, entities: [{ entityId: 'ZA194602118006', internationalName: 'The Bidvest Group Ltd', countryName: 'South Africa' }] }),
    })) as unknown as typeof fetch)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('searches on input and adds the selected entity', async () => {
    const onAdd = vi.fn()
    render(<AddCompanyDialog onAdd={onAdd} existingIds={new Set()} />)

    await userEvent.click(screen.getByText('Add Company ▾'))
    await userEvent.type(screen.getByPlaceholderText('e.g. Bidvest'), 'Bidvest')

    const hit = await screen.findByText('The Bidvest Group Ltd')
    expect(hit).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/entities/search?query=Bidvest'),
      expect.any(Object),
    )

    await userEvent.click(hit)
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'ZA194602118006' }))
  })

  it('disables entities already in the portfolio', async () => {
    const onAdd = vi.fn()
    render(<AddCompanyDialog onAdd={onAdd} existingIds={new Set(['ZA194602118006'])} />)
    await userEvent.click(screen.getByText('Add Company ▾'))
    await userEvent.type(screen.getByPlaceholderText('e.g. Bidvest'), 'Bidvest')
    await screen.findByText('The Bidvest Group Ltd')
    await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument())
  })
})
