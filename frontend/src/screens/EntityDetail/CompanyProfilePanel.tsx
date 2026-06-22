import { useEffect, useState } from 'react'
import { getEntityProfile, type EntityProfile } from '../../data/search'

const FIELDS: { label: string; key: keyof EntityProfile }[] = [
  { label: 'Name', key: 'internationalName' },
  { label: 'Entity ID', key: 'entityId' },
  { label: 'BvD ID', key: 'identifierBvd' },
  { label: 'Orbis ID', key: 'identifierOrbis' },
  { label: 'CreditEdge PID', key: 'pid' },
  { label: 'Ticker', key: 'ticker' },
  { label: 'Country', key: 'countryName' },
  { label: 'City', key: 'contactCity' },
  { label: 'Industry', key: 'primaryIndustryNDYDescription' },
  { label: 'Financials', key: 'hasFinancials' },
  { label: 'Peer Group 1', key: 'peerGroupId1' },
  { label: 'Peer Group 2', key: 'peerGroupId2' },
]

export function CompanyProfilePanel({ entityId }: { entityId: string }) {
  const [profile, setProfile] = useState<EntityProfile | undefined>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const c = new AbortController()
    setStatus('loading')
    getEntityProfile(entityId, c.signal)
      .then((p) => { setProfile(p); setStatus('ready') })
      .catch((e) => { if (e.name !== 'AbortError') setStatus('error') })
    return () => c.abort()
  }, [entityId])

  if (status === 'loading') return <div className="text-sm text-muted">Loading profile…</div>
  if (status === 'error') return <div className="rounded-card bg-card p-6 shadow-card text-sm text-bad">Couldn't load profile.</div>

  return (
    <div className="rounded-card bg-card p-5 shadow-card">
      <div className="mb-3 text-[15px] font-semibold text-ink">Company Profile</div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 md:grid-cols-3">
        {FIELDS.map((f) => {
          const v = profile?.[f.key]
          return (
            <div key={f.label}>
              <dt className="text-[11px] uppercase tracking-wide text-muted">{f.label}</dt>
              <dd className="text-sm text-ink">{v ? String(v) : '—'}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
