import gridIcon from '../assets/icons/dashboard/grid.svg'
import bookOpenIcon from '../assets/icons/dashboard/book-open.svg'
import usersIcon from '../assets/icons/dashboard/users.svg'
import barChartIcon from '../assets/icons/dashboard/bar-chart.svg'
import settingsIcon from '../assets/icons/dashboard/settings.svg'

export const teacherNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: gridIcon, path: '/teacher/dashboard' },
  { id: 'my-classes', label: 'My Classes', icon: bookOpenIcon, path: '/teacher/classes' },
  { id: 'students', label: 'Students', icon: usersIcon, path: '/teacher/students' },
  { id: 'reports', label: 'Reports', icon: barChartIcon, path: '/teacher/reports' },
  { id: 'settings', label: 'Settings', icon: settingsIcon, path: '/teacher/settings' },
]

export const studentNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: gridIcon, path: '/student/dashboard' },
  { id: 'my-progress', label: 'My Progress', icon: bookOpenIcon, path: '/student/progress' },
  { id: 'support-plan', label: 'Support Plan', icon: settingsIcon, path: '/student/support-plan' },
]

// Academic Progress intentionally covers grades/attendance/assignments/feedback in one page
// (SCRUM-147) rather than as separate nav items — the Figma design has one combined frame, not
// several. Messages has no backend or ticket yet, so it's left off rather than linking nowhere.
export const parentNavItems = [
  { id: 'overview', label: 'Overview', icon: gridIcon, path: '/parent/overview' },
  { id: 'academic-progress', label: 'Academic Progress', icon: barChartIcon, path: '/parent/academic-progress' },
  { id: 'support-plan', label: 'Support Plan', icon: settingsIcon, path: '/parent/support-plan' },
]