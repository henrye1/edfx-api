import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { searchEntities, type EntityHit } from '../data/search'

export function AddCompanyDialog({ onAdd, existingIds }: { onAdd: (hit: EntityHit) => void; existingIds: Set<string> }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EntityHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search whenever the query changes while the dialog is open.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) { setResults([]); setError(null); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true); setError(null)
    const t = setTimeout(() => {
      searchEntities(q, controller.signal)
        .then((hits) => setResults(hits))
        .catch((e) => { if (e.name !== 'AbortError') setError('Search failed. Is the API running?') })
        .finally(() => setLoading(false))
    }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [query, open])

  // Reset state each time the dialog opens.
  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setError(null); setLoading(false) }
  }, [open])

  const select = (hit: EntityHit) => { onAdd(hit); setOpen(false) }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="rounded-full bg-brand px-4 py-1.5 text-xs text-white">Add Company ▾</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-card bg-card p-5 shadow-card">
          <Dialog.Title className="text-base font-semibold text-ink">Add Company</Dialog.Title>
          <Dialog.Description className="mb-3 text-xs text-muted">
            Search EDF-X by company name or identifier, then select the correct entity.
          </Dialog.Description>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Bidvest"
            className="w-full rounded-full border border-[#e3e5e9] bg-white px-4 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <div className="mt-3 max-h-72 overflow-y-auto">
            {loading && <div className="p-3 text-xs text-muted">Searching…</div>}
            {error && <div className="p-3 text-xs text-bad">{error}</div>}
            {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
              <div className="p-3 text-xs text-muted">No matches.</div>
            )}
            <ul>
              {results.map((hit) => {
                const added = existingIds.has(hit.entityId)
                return (
                  <li key={hit.entityId}>
                    <button
                      disabled={added}
                      onClick={() => select(hit)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#f1f4fb] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm text-ink">{hit.internationalName ?? hit.entityId}</span>
                        <span className="block text-[11px] text-muted">
                          {hit.entityId}
                          {hit.countryName ? ` · ${hit.countryName}` : ''}
                          {hit.primaryIndustryNDYDescription ? ` · ${hit.primaryIndustryNDYDescription}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-brand">{added ? 'Added' : 'Add'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
