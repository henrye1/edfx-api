import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('echarts-for-react', () => ({ default: () => null }))

import { UploadScreen } from '../Upload/UploadScreen'

afterEach(() => vi.unstubAllGlobals())

describe('UploadScreen', () => {
  it('uploads a file and shows PIT and TTC PDs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: 'completed', entityName: 'Test Co', asOfDate: '2026-06-01',
        pitPd: 0.0094, ttcPd: 0.0109, impliedRating: 'Ba1', confidence: 'PF-G-R', model: 'Private firm, RiskCalc model.',
        termStructure: [], ratios: [{ label: 'Current Ratio', value: 2 }],
        financials: [{ group: 'Provided financial inputs (model drivers)', items: [{ label: 'totalAssets', value: 120 }] }],
      }),
    })) as unknown as typeof fetch)

    const { container } = render(<UploadScreen />)
    const file = new File(['entityIdentifierbvd,totalAssets\nX,120\n'], 'inputs.csv', { type: 'text/csv' })
    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, file)
    await userEvent.click(screen.getByRole('button', { name: /Score file/ }))

    expect(await screen.findByText('Point-in-Time PD (CCA)')).toBeInTheDocument()
    expect(screen.getByText('0.94%')).toBeInTheDocument()       // PIT
    expect(screen.getByText('1.09%')).toBeInTheDocument()       // TTC
    expect(screen.getByText('Current Ratio')).toBeInTheDocument()
    expect(screen.getByText('totalAssets')).toBeInTheDocument()
  })
})
