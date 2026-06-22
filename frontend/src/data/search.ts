/** A single entity hit from the EDF-X search endpoint (subset we display). */
export interface EntityHit {
  entityId: string
  internationalName?: string | null
  countryName?: string | null
  contactCity?: string | null
  primaryIndustryNDYDescription?: string | null
  ticker?: string | null
}

interface SearchResponse {
  entities: EntityHit[]
  total: number
}

/**
 * Searches EDF-X via the .NET proxy (/api/entities/search). Returns [] for
 * blank/too-short queries or on error (the caller renders an empty state).
 */
export async function searchEntities(query: string, signal?: AbortSignal): Promise<EntityHit[]> {
  if (query.trim().length < 2) return []
  const res = await fetch(`/api/entities/search?query=${encodeURIComponent(query.trim())}`, { signal })
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`)
  const data: SearchResponse = await res.json()
  return data.entities ?? []
}

/** One monthly point in the PD / implied-rating history. */
export interface PdPoint {
  date?: string | null
  pd?: number | null
  impliedRating?: string | null
}

/** One tenor point of the PD term structure. */
export interface TermPoint {
  tenor: string
  forward?: number | null
  cumulative?: number | null
}

/** Live summary KPIs + history for one entity (from the .NET /summary endpoint). */
export interface EntitySummaryLive {
  entityId: string
  name?: string | null
  asOfDate?: string | null
  pd?: number | null            // probability, e.g. 0.0019
  impliedRating?: string | null
  ews?: string | null           // Low/Medium/High/Severe
  ewsChange?: string | null     // Deteriorated/Improved/No Change
  trigger?: number | null       // EWS trigger PD level
  confidence?: string | null    // model/quality code, e.g. "P-G-R"
  model?: string | null         // e.g. "Public firm, CreditEdge model. Based on recent and good quality inputs."
  pdHistory?: PdPoint[]
  termStructure?: TermPoint[]
}

export async function getEntitySummary(id: string, signal?: AbortSignal): Promise<EntitySummaryLive> {
  const res = await fetch(`/api/entities/${encodeURIComponent(id)}/summary`, { signal })
  if (!res.ok) throw new Error(`Summary failed (HTTP ${res.status})`)
  return res.json()
}

/** Firmographic profile (identifiers, industry, location) for the Company Profile section. */
export interface EntityProfile {
  entityId: string
  internationalName?: string | null
  identifierBvd?: string | null
  identifierOrbis?: string | null
  pid?: string | null
  ticker?: string | null
  countryName?: string | null
  contactCity?: string | null
  primaryIndustryNDYDescription?: string | null
  hasFinancials?: string | null
  peerGroupId1?: string | null
  peerGroupId2?: string | null
}

export async function getEntityProfile(id: string, signal?: AbortSignal): Promise<EntityProfile> {
  const res = await fetch(`/api/entities/${encodeURIComponent(id)}/profile`, { signal })
  if (!res.ok) throw new Error(`Profile failed (HTTP ${res.status})`)
  return res.json()
}

/** Raw statement + ratios objects (nested groups) for the Financials section. */
export interface Financials {
  statement?: Record<string, unknown> | null
  ratios?: Record<string, unknown> | null
}

export async function getEntityFinancials(id: string, signal?: AbortSignal): Promise<Financials> {
  const res = await fetch(`/api/entities/${encodeURIComponent(id)}/financials`, { signal })
  if (!res.ok) throw new Error(`Financials failed (HTTP ${res.status})`)
  return res.json()
}

/** Recomputed PD result from the what-if (modelInputs) flow. */
export interface WhatIfResult {
  status: 'completed' | 'failed' | 'error'
  pd?: number | null
  impliedRating?: string | null
  asOfDate?: string | null
  error?: string | null
}

export async function computeWhatIf(id: string, overrides: Record<string, number>, signal?: AbortSignal): Promise<WhatIfResult> {
  const res = await fetch(`/api/entities/${encodeURIComponent(id)}/whatif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
    signal,
  })
  if (!res.ok) throw new Error(`What-if failed (HTTP ${res.status})`)
  return res.json()
}

/** A company persisted to a portfolio (snapshot of its loaded data). */
export interface PersistedCompany {
  entityId: string
  name?: string | null
  industry?: string | null
  pd?: number | null
  impliedRating?: string | null
  ews?: string | null
  ewsChange?: string | null
  peerPercentile?: number | null
}

export async function getPortfolioCompanies(portfolioId: string, signal?: AbortSignal): Promise<PersistedCompany[]> {
  try {
    const res = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}/companies`, { signal })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return [] // store unavailable — portfolio still loads from its base data
  }
}

/** A persisted portfolio with company aggregates (from GET /api/portfolios). */
export interface PersistedPortfolio {
  portfolioId: string
  name: string
  createdBy?: string | null
  companyCount: number
  low: number
  medium: number
  high: number
  severe: number
  needData: number
  pdMedian?: number | null
}

export async function listPortfolios(signal?: AbortSignal): Promise<PersistedPortfolio[]> {
  try {
    const res = await fetch('/api/portfolios', { signal })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export interface CreatePortfolioResult { portfolioId: string; name: string; persisted: boolean }

/** Creates a portfolio. Returns the generated id even if persistence is unavailable. */
export async function createPortfolio(name: string): Promise<CreatePortfolioResult> {
  const res = await fetch('/api/portfolios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  // 503 still returns a usable id (persisted:false); only a hard failure throws.
  if (!res.ok && res.status !== 503) throw new Error(`Create failed (HTTP ${res.status})`)
  return res.json()
}

export async function getPortfolioName(portfolioId: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}`, { signal })
    if (!res.ok) return null
    return (await res.json()).name ?? null
  } catch {
    return null
  }
}

/** Result of scoring an uploaded financials file via the modelInputs flow. */
export interface NamedValue { label: string; value?: number | null }
export interface FinGroup { group: string; items: NamedValue[] }
export interface UploadScoreResult {
  status: 'completed' | 'failed' | 'error'
  error?: string | null
  entityName?: string | null
  asOfDate?: string | null
  pitPd?: number | null
  ttcPd?: number | null
  impliedRating?: string | null
  confidence?: string | null
  model?: string | null
  termStructure?: TermPoint[]
  financials?: FinGroup[]
  ratios?: NamedValue[]
}

export async function scoreUpload(file: File): Promise<UploadScoreResult> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/uploads/score', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`)
  return res.json()
}

/** Deletes a portfolio (and its companies). Returns true if it was removed from the store. */
export async function deletePortfolio(portfolioId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

/** Removes a single company from a portfolio. Returns true if removed from the store. */
export async function removePortfolioCompany(portfolioId: string, entityId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}/companies/${encodeURIComponent(entityId)}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

/** Persists a company to a portfolio. Returns true if stored, false if the store is unavailable. */
export async function addPortfolioCompany(portfolioId: string, company: PersistedCompany): Promise<boolean> {
  try {
    const res = await fetch(`/api/portfolios/${encodeURIComponent(portfolioId)}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company),
    })
    return res.ok
  } catch {
    return false
  }
}
