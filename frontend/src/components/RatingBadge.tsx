export function RatingBadge({ value }: { value: string }) {
  return (
    <span className="inline-block rounded-md border border-[#c9d6ff] bg-[#eef2ff] px-2 py-0.5 text-[13px] font-semibold text-brand">
      {value}
    </span>
  )
}
