import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { data } from '../../data'
import type { EntityDetail as ED } from '../../data/types'
import { getEntitySummary, type EntitySummaryLive } from '../../data/search'
import { EntitySubNav, type EntitySection } from '../../components/chrome/EntitySubNav'
import { SummaryPanel } from './SummaryPanel'
import { CompanyProfilePanel } from './CompanyProfilePanel'
import { CreditRiskPanel } from './CreditRiskPanel'
import { FinancialsPanel } from './FinancialsPanel'
import { PlaceholderPanel } from './PlaceholderPanel'

export function EntityDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<EntitySummaryLive | undefined>()
  const [mock, setMock] = useState<ED | undefined>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [section, setSection] = useState<EntitySection>('Summary')

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    setSection('Summary')
    Promise.all([getEntitySummary(id, controller.signal), data.getEntity(id)])
      .then(([s, m]) => { setSummary(s); setMock(m); setStatus('ready') })
      .catch((err) => { if (err.name !== 'AbortError') setStatus('error') })
    return () => controller.abort()
  }, [id])

  const BackBar = (
    <div className="mb-3 flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="text-xs text-brand">‹ Back</button>
      <Link to="/" className="text-xs text-muted">My Portfolios</Link>
    </div>
  )

  if (status === 'loading') return <div>{BackBar}<div className="text-sm text-muted">Loading live data…</div></div>

  if (status === 'error') {
    return (
      <div>
        {BackBar}
        <div className="rounded-card bg-card p-6 shadow-card">
          <div className="text-base font-semibold text-ink">Couldn't load live data</div>
          <p className="mt-2 max-w-prose text-sm text-muted">
            The EDF-X API didn't respond for <b className="text-ink">{id}</b>. Make sure the .NET app is
            running, then retry.
          </p>
        </div>
      </div>
    )
  }

  const name = summary?.name ?? mock?.name ?? id

  return (
    <div>
      {BackBar}
      <div className="text-xl font-bold text-ink">
        {name} <span className="ml-1 rounded-md bg-[#eef2ff] px-1.5 py-0.5 text-[11px] text-brand">Live ⓘ</span>
      </div>
      <div className="my-1.5 text-[11px] text-[#9aa0ab]">
        Company ID <b className="text-ink">{id}</b>
        {summary?.asOfDate ? <> · As of <b className="text-ink">{summary.asOfDate}</b></> : null}
      </div>

      <div className="flex gap-4">
        <EntitySubNav active={section} onSelect={setSection} />
        <div className="flex-1">
          {section === 'Summary' && <SummaryPanel summary={summary} mock={mock} />}
          {section === 'Company Profile' && <CompanyProfilePanel entityId={id} />}
          {section === 'Credit Risk' && <CreditRiskPanel summary={summary} />}
          {section === 'Financials' && <FinancialsPanel entityId={id} />}
          {section === 'Instruments' && <PlaceholderPanel title="Instruments" />}
          {section === 'What If' && <PlaceholderPanel title="What If" />}
          {section === 'Credit Sentiment Score' && <PlaceholderPanel title="Credit Sentiment Score" />}
        </div>
      </div>
    </div>
  )
}
