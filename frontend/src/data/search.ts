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
}

export async function getEntitySummary(id: string, signal?: AbortSignal): Promise<EntitySummaryLive> {
  const res = await fetch(`/api/entities/${encodeURIComponent(id)}/summary`, { signal })
  if (!res.ok) throw new Error(`Summary failed (HTTP ${res.status})`)
  return res.json()
}
