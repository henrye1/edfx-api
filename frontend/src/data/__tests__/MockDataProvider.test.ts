import { describe, it, expect } from 'vitest'
import { MockDataProvider } from '../MockDataProvider'

const p = new MockDataProvider()

describe('MockDataProvider', () => {
  it('lists portfolios', async () => {
    const list = await p.getPortfolios()
    expect(list.length).toBeGreaterThan(0)
    expect(list[0]).toHaveProperty('distribution')
  })
  it('returns a portfolio detail with companies', async () => {
    const list = await p.getPortfolios()
    const detail = await p.getPortfolio(list[0].id)
    expect(detail?.companies.length).toBeGreaterThan(0)
  })
  it('returns an entity detail by id', async () => {
    const e = await p.getEntity('ZA194602118006')
    expect(e?.name).toMatch(/Bidvest/)
    expect(e?.kpis.length).toBeGreaterThan(0)
  })
})
