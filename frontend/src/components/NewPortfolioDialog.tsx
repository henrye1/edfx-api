import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { createPortfolio } from '../data/search'

export function NewPortfolioDialog({ onCreated }: { onCreated: (id: string, name: string, persisted: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const n = name.trim()
    if (!n) return
    setBusy(true); setError(null)
    try {
      const res = await createPortfolio(n)
      setOpen(false); setName('')
      onCreated(res.portfolioId, res.name, res.persisted)
    } catch {
      setError('Could not create the portfolio. Is the API running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) { setName(''); setError(null) } }}>
      <Dialog.Trigger asChild>
        <button className="rounded-full bg-brand px-4 py-2 text-sm text-white">+ New Portfolio</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-card bg-card p-5 shadow-card">
          <Dialog.Title className="text-base font-semibold text-ink">New Portfolio</Dialog.Title>
          <Dialog.Description className="mb-3 text-xs text-muted">Name your portfolio. You can add companies to it next.</Dialog.Description>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="e.g. SA Banks Watchlist"
            className="w-full rounded-full border border-[#e3e5e9] bg-white px-4 py-2 text-sm text-ink outline-none focus:border-brand" />
          {error && <div className="mt-2 text-xs text-bad">{error}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-full px-4 py-1.5 text-xs text-muted">Cancel</button>
            </Dialog.Close>
            <button onClick={submit} disabled={busy || !name.trim()}
              className="rounded-full bg-brand px-4 py-1.5 text-xs text-white disabled:opacity-50">
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
