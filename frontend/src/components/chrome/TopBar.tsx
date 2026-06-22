export function TopBar({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center gap-4 bg-navy px-4 text-white">
      <strong className="tracking-wide">MOODY'S&nbsp;|&nbsp;EDF-X</strong>
      <input placeholder="Search by Company Name or Identifier"
        className="ml-2 w-full max-w-md rounded-full bg-white px-4 py-2 text-sm text-ink" />
      <span className="rounded-full bg-gradient-to-r from-[#2bb3a3] to-[#7c5cff] px-4 py-2 text-sm">EDF-X Navigator</span>
      <div className="ml-auto flex items-center gap-3 text-sm">
        <span>?</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3b4ba0] text-xs">{userName.slice(0, 2).toUpperCase()}</span>
        <span className="leading-tight">{userName}<br /><span className="text-[11px] text-white/70">{userEmail}</span></span>
        <span>▾</span><span>⋮⋮⋮</span>
      </div>
    </header>
  )
}
