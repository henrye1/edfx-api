import { Outlet } from 'react-router-dom'
import { TopBar } from './components/chrome/TopBar'
import { IconRail } from './components/chrome/IconRail'

export default function App() {
  return (
    <div className="min-h-full bg-appbg">
      <TopBar userName="Henry" userEmail="henry@anchorpointrisk.co.za" />
      <IconRail active="portfolios" />
      <main className="ml-14 mt-16 p-5"><Outlet /></main>
    </div>
  )
}
