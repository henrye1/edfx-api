import { MockDataProvider } from './MockDataProvider'
import type { DataProvider } from './DataProvider'
export const data: DataProvider = new MockDataProvider()
export * from './types'
