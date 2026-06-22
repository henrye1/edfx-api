import type { PortfolioSummary, PortfolioDetail, EntityDetail } from './types'

export interface DataProvider {
  getPortfolios(): Promise<PortfolioSummary[]>
  getPortfolio(id: string): Promise<PortfolioDetail | undefined>
  getEntity(id: string): Promise<EntityDetail | undefined>
}
