import { NavLink } from 'react-router-dom'
import logoMark from '../../assets/icons/dashboard/logo-mark.svg'

function Sidebar({ portalLabel, navItems, user }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logoMark} alt="" className="sidebar-logo-mark" />

        <div className="sidebar-logo-text">
          <p className="sidebar-brand-name">StudentSuccess</p>
          <p className="sidebar-portal-label">{portalLabel}</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map(({ id, label, icon, path }) => (
          <NavLink
            key={id}
            to={path}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' is-active' : ''}`
            }
          >
            <span className="sidebar-nav-icon">
              <img src={icon} alt="" />
            </span>

            <span className="sidebar-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-profile">
        <img src={user.avatarUrl} alt="" className="sidebar-profile-avatar" />

        <div className="sidebar-profile-text">
          <p className="sidebar-profile-name">{user.name}</p>
          <p className="sidebar-profile-subtitle">{user.subtitle}</p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
