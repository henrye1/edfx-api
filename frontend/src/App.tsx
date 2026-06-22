import { Outlet, useLocation } from 'react-router-dom'
import { TopBar } from './components/chrome/TopBar'
import { IconRail } from './components/chrome/IconRail'

export default function App() {
  const { pathname } = useLocation()
  const active = pathname.startsWith('/upload') ? 'upload' : 'portfolios'
  return (
    <div className="min-h-full bg-appbg">
      <TopBar userName="Henry" userEmail="henry@anchorpointrisk.co.za" />
      <IconRail active={active} />
      <main className="ml-14 mt-16 p-5"><Outlet /></main>
    </div>
  )
}
