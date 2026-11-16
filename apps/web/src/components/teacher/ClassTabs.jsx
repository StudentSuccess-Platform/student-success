import { NavLink } from 'react-router-dom'

const COMING_SOON_TABS = ['Assignments & Grades', 'Attendance']

/**
 * Shared tab bar for the Class Detail page (Overview, Roster, and future
 * Assignments & Grades / Attendance tabs), so each tab's own view only
 * renders its own panel content instead of duplicating this header.
 */
function ClassTabs({ classId }) {
  return (
    <nav className="class-tabs" aria-label="Class sections">
      <NavLink
        to={`/teacher/classes/${classId}`}
        end
        className={({ isActive }) => `class-tabs-item${isActive ? ' is-active' : ''}`}
      >
        Overview
      </NavLink>

      <NavLink
        to={`/teacher/classes/${classId}/roster`}
        className={({ isActive }) => `class-tabs-item${isActive ? ' is-active' : ''}`}
      >
        Roster
      </NavLink>

      {COMING_SOON_TABS.map((label) => (
        <span key={label} className="class-tabs-item class-tabs-item--disabled" aria-disabled="true">
          {label}
        </span>
      ))}
    </nav>
  )
}

export default ClassTabs
