// Tab definitions for the student profile (plain data and id helpers, no components).

export const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'grades', label: 'Grades' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'goals', label: 'Goals & Feedback' },
  { id: 'plans', label: 'Support Plans' },
]

export const tabId = (id) => `profile-tab-${id}`
export const panelId = (id) => `profile-panel-${id}`
