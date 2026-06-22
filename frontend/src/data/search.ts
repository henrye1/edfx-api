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
