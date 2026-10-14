/**
 * Mock data for the Teacher Dashboard, shaped to match the proposed
 * `GET /api/teacher/dashboard` response contract.
 *
 * @typedef {Object} DashboardSummary
 * @property {number} totalClasses
 * @property {number} totalStudents
 * @property {number} studentsNeedingIntervention
 * @property {number} averageAttendance - 0-100
 *
 * @typedef {Object} PerformanceTrendPoint
 * @property {string} label
 * @property {number} value - 0-100
 *
 * @typedef {Object} AttendanceClassRate
 * @property {string} name
 * @property {number} rate - 0-100
 *
 * @typedef {Object} AttendanceOverviewData
 * @property {number} overallRate - 0-100
 * @property {AttendanceClassRate[]} classes
 *
 * @typedef {Object} InterventionStudent
 * @property {string} id - opaque id (MongoDB ObjectId string)
 * @property {string} name
 * @property {string} className
 * @property {string} reason
 * @property {'high'|'medium'|'low'} severity
 *
 * @typedef {Object} ActivityItem
 * @property {string} id - opaque id (MongoDB ObjectId string)
 * @property {string} description
 * @property {string} timestamp - ISO 8601; formatted client-side
 * @property {string} [actionLabel] - omitted entirely when not actionable
 *
 * @typedef {Object} TeacherDashboardData
 * @property {DashboardSummary} summary
 * @property {PerformanceTrendPoint[]} performanceTrend
 * @property {AttendanceOverviewData} attendanceOverview
 * @property {InterventionStudent[]} interventions
 * @property {ActivityItem[]} recentActivity
 */

export const statsSummary = {
  totalClasses: 6,
  totalStudents: 162,
  studentsNeedingIntervention: 8,
  averageAttendance: 94,
}

export const performanceTrend = [
  { label: 'Week 1', value: 78 },
  { label: 'Week 2', value: 80 },
  { label: 'Week 3', value: 79 },
  { label: 'Week 4', value: 83 },
  { label: 'Week 5', value: 85 },
  { label: 'Week 6', value: 84 },
]

export const attendanceOverview = {
  overallRate: 94,
  classes: [
    { name: 'Algebra II', rate: 96 },
    { name: 'AP Biology', rate: 91 },
    { name: 'English Lit.', rate: 95 },
    { name: 'World History', rate: 89 },
    { name: 'Chemistry', rate: 97 },
    { name: 'Geometry', rate: 93 },
  ],
}

export const interventions = [
  {
    id: '1',
    name: 'Marcus Lee',
    className: 'Algebra II',
    reason: 'Grade below 65%',
    severity: 'high',
  },
  {
    id: '2',
    name: 'Ava Thompson',
    className: 'Chemistry',
    reason: 'Attendance below 80%',
    severity: 'high',
  },
  {
    id: '3',
    name: 'Noah Patel',
    className: 'World History',
    reason: 'Missing 3 assignments',
    severity: 'medium',
  },
  {
    id: '4',
    name: 'Sofia Martinez',
    className: 'AP Biology',
    reason: 'Grade dropped 15 points',
    severity: 'medium',
  },
]

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

export const recentActivity = [
  {
    id: '1',
    description: '12 new assignment submissions in Algebra II',
    timestamp: minutesAgo(10),
    actionLabel: 'Review',
  },
  {
    id: '2',
    description: "Parent message from Ava Thompson's guardian",
    timestamp: minutesAgo(60),
    actionLabel: 'Reply',
  },
  {
    id: '3',
    description: 'Attendance submitted for World History - Period 5',
    timestamp: minutesAgo(120),
  },
  {
    id: '4',
    description: '5 assignments pending grading in Chemistry',
    timestamp: minutesAgo(24 * 60),
    actionLabel: 'Grade now',
  },
]
