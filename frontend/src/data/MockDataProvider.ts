import type { DataProvider } from './DataProvider'
import { PORTFOLIOS, PORTFOLIO_DETAILS } from './fixtures/portfolios'
import { ENTITIES } from './fixtures/entities'

export class MockDataProvider implements DataProvider {
  async getPortfolios() { return PORTFOLIOS }
  async getPortfolio(id: string) { return PORTFOLIO_DETAILS[id] }
  async getEntity(id: string) { return ENTITIES[id] }
}
