import { Outlet } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import '../styles/dashboard.css'
import '../styles/teacher-shared.css'

function DashboardLayout({ portalLabel, navItems, user }) {
  return (
    <div className="dashboard-layout">
      <Sidebar portalLabel={portalLabel} navItems={navItems} user={user} />

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
