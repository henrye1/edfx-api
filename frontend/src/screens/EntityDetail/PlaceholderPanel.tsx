type Info = { blurb: string; reason: string; kind: 'no-endpoint' | 'not-entitled' }

const SECTION_INFO: Record<string, Info> = {
  Instruments: {
    blurb: 'Instrument-level detail (bonds, CDS, equity) for the issuer.',
    reason: 'The EDF-X API exposes instrument identifiers (e.g. FIGI) in entity data but has no instrument-level analytics endpoint.',
    kind: 'no-endpoint',
  },
  'What If': {
    blurb: 'Re-price PD under user-supplied financials or macro scenarios.',
    reason: 'There is no scenario/what-if read endpoint in the EDF-X API. The closest capability is the financial-statement upload flow (/entities/modelInputs), which recomputes PD from your own inputs — a separate, asynchronous feature.',
    kind: 'no-endpoint',
  },
  'Credit Sentiment Score': {
    blurb: 'News/market-derived sentiment signal for the issuer.',
    reason: 'Credit Sentiment Score is a Moody’s web-product feature with no corresponding EDF-X API endpoint.',
    kind: 'no-endpoint',
  },
}

export function PlaceholderPanel({ title }: { title: string }) {
  const info = SECTION_INFO[title]
  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-ink">{title}</span>
        <span className="rounded-full bg-[#fdeaea] px-2 py-0.5 text-[11px] font-semibold text-bad">Not available via API</span>
      </div>
      {info && <p className="mt-2 text-sm text-ink">{info.blurb}</p>}
      <p className="mt-2 max-w-prose text-sm text-muted">
        {info?.reason ?? 'This section is not wired to live EDF-X data in this build.'}
      </p>
    </div>
  )
}
