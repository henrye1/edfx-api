export function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      <div className="text-base font-semibold text-ink">{title}</div>
      <p className="mt-2 max-w-prose text-sm text-muted">
        This section isn't wired to live EDF-X data in this build. {title} relies on data sources
        (e.g. instrument-level pricing, scenario inputs, or sentiment feeds) that aren't part of the
        endpoints currently integrated.
      </p>
    </div>
  )
}
