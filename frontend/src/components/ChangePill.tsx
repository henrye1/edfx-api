import clsx from 'clsx'

type Tone = 'good' | 'bad' | 'neutral'

const TONE: Record<Tone, string> = {
  good: 'bg-[#e7f6ea] text-good',
  bad: 'bg-[#fdeaea] text-bad',
  neutral: 'bg-[#eef0f4] text-muted',
}

export function ChangePill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span className={clsx('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', TONE[tone])}>
      {label}
    </span>
  )
}
