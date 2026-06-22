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
