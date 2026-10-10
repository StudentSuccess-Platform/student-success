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
