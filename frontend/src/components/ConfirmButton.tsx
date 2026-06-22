import { useState } from 'react'
import clsx from 'clsx'

/** A button that requires a second click (Confirm) before firing — for destructive actions. */
export function ConfirmButton({ label, onConfirm, className }: { label: string; onConfirm: () => void; className?: string }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <span className="whitespace-nowrap text-xs">
        <button onClick={() => { setConfirming(false); onConfirm() }} className="font-semibold text-bad">Confirm</button>
        {' '}
        <button onClick={() => setConfirming(false)} className="text-muted">Cancel</button>
      </span>
    )
  }
  return <button onClick={() => setConfirming(true)} className={clsx('text-xs text-bad', className)}>{label}</button>
}
