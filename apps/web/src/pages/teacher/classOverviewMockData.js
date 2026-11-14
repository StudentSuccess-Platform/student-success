/**
 * Demonstration data for the Teacher Class Overview page's academic sections
 * (stats, trend, interventions, assignments, activity), shaped to match the
 * proposed `GET /api/teacher/classes/:classId/overview` response contract.
 *
 * The class header (name, period, room, enrollment) comes from the real
 * `GET /api/v1/teacher/classes` response instead — only this academic detail
 * is still a placeholder. `useTeacherClassOverviewData` picks one template
 * per real class id deterministically (see `classOverviewTemplates`),
 * so a given class always sees the same demo content, until a real
 * `:classId/overview` endpoint replaces this file.
 *
 * @typedef {Object} ClassStats
 * @property {number} averageGrade - 0-100
 * @property {number} attendanceRate - 0-100
 * @property {number} studentsNeedingIntervention
 *
 * @typedef {Object} ClassPerformancePoint
 * @property {string} label
 * @property {number} value - 0-100
 *
 * @typedef {Object} ClassInterventionStudent
 * @property {string} id - opaque id (MongoDB ObjectId string)
 * @property {string} name
 * @property {string} className
 * @property {string} reason
 * @property {'high'|'medium'|'low'} severity
 *
 * @typedef {Object} ClassAssignment
 * @property {string} id - opaque id (MongoDB ObjectId string)
 * @property {string} title
 * @property {string} dueDate - display-ready, e.g. "Nov 6"
 * @property {'upcoming'|'in-progress'|'graded'} status
 *
 * @typedef {Object} ClassActivityItem
 * @property {string} id - opaque id (MongoDB ObjectId string)
 * @property {string} description
 * @property {string} timestamp - ISO 8601; formatted client-side
 *
 * @typedef {Object} ClassOverviewTemplate
 * @property {'math'|'science'|'english'|'history'} subject - used to pick a
 *   template whose assignments/activity fit the real class's subject
 * @property {ClassStats} stats
 * @property {ClassPerformancePoint[]} performanceTrend
 * @property {ClassInterventionStudent[]} interventions
 * @property {ClassAssignment[]} assignments
 * @property {ClassActivityItem[]} recentActivity
 */

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

/** @type {ClassOverviewTemplate[]} */
export const classOverviewTemplates = [
  {
    subject: 'math',
    stats: { averageGrade: 82, attendanceRate: 96, studentsNeedingIntervention: 1 },
    performanceTrend: [
      { label: 'Week 1', value: 76 },
      { label: 'Week 2', value: 79 },
      { label: 'Week 3', value: 81 },
      { label: 'Week 4', value: 80 },
      { label: 'Week 5', value: 83 },
      { label: 'Week 6', value: 82 },
    ],
    interventions: [
      {
        id: '1',
        name: 'Marcus Lee',
        className: 'Algebra II',
        reason: 'Grade below 65%',
        severity: 'high',
      },
    ],
    assignments: [
      { id: '1', title: 'Chapter 4 Quiz', dueDate: 'Nov 6', status: 'upcoming' },
      { id: '2', title: 'Factoring Worksheet', dueDate: 'Nov 3', status: 'in-progress' },
      { id: '3', title: 'Chapter 3 Test', dueDate: 'Oct 28', status: 'graded' },
    ],
    recentActivity: [
      {
        id: '1',
        description: '12 new submissions for Factoring Worksheet',
        timestamp: minutesAgo(10),
      },
      {
        id: '2',
        description: 'Attendance submitted for Period 2',
        timestamp: minutesAgo(120),
      },
    ],
  },
  {
    subject: 'science',
    stats: { averageGrade: 79, attendanceRate: 91, studentsNeedingIntervention: 1 },
    performanceTrend: [
      { label: 'Week 1', value: 74 },
      { label: 'Week 2', value: 77 },
      { label: 'Week 3', value: 75 },
      { label: 'Week 4', value: 78 },
      { label: 'Week 5', value: 80 },
      { label: 'Week 6', value: 79 },
    ],
    interventions: [
      {
        id: '2',
        name: 'Sofia Martinez',
        className: 'AP Biology',
        reason: 'Grade dropped 15 points',
        severity: 'medium',
      },
    ],
    assignments: [
      { id: '4', title: 'Cell Structure Lab Report', dueDate: 'Nov 7', status: 'upcoming' },
      { id: '5', title: 'Genetics Problem Set', dueDate: 'Oct 30', status: 'graded' },
    ],
    recentActivity: [
      {
        id: '3',
        description: 'Lab report rubric posted',
        timestamp: minutesAgo(45),
      },
    ],
  },
  {
    subject: 'english',
    stats: { averageGrade: 88, attendanceRate: 95, studentsNeedingIntervention: 0 },
    performanceTrend: [
      { label: 'Week 1', value: 85 },
      { label: 'Week 2', value: 86 },
      { label: 'Week 3', value: 87 },
      { label: 'Week 4', value: 89 },
      { label: 'Week 5', value: 88 },
      { label: 'Week 6', value: 88 },
    ],
    interventions: [],
    assignments: [
      { id: '6', title: 'Essay: Symbolism in The Great Gatsby', dueDate: 'Nov 10', status: 'upcoming' },
      { id: '7', title: 'Reading Journal - Ch. 1-5', dueDate: 'Nov 1', status: 'in-progress' },
    ],
    recentActivity: [
      {
        id: '4',
        description: '8 reading journals submitted',
        timestamp: minutesAgo(90),
      },
    ],
  },
  {
    subject: 'history',
    stats: { averageGrade: 74, attendanceRate: 89, studentsNeedingIntervention: 1 },
    performanceTrend: [
      { label: 'Week 1', value: 72 },
      { label: 'Week 2', value: 70 },
      { label: 'Week 3', value: 73 },
      { label: 'Week 4', value: 71 },
      { label: 'Week 5', value: 75 },
      { label: 'Week 6', value: 74 },
    ],
    interventions: [
      {
        id: '3',
        name: 'Noah Patel',
        className: 'World History',
        reason: 'Missing 3 assignments',
        severity: 'medium',
      },
    ],
    assignments: [
      { id: '8', title: 'Treaty of Versailles Essay', dueDate: 'Nov 5', status: 'in-progress' },
      { id: '9', title: 'Unit 4 Test', dueDate: 'Oct 27', status: 'graded' },
    ],
    recentActivity: [
      {
        id: '5',
        description: 'Attendance submitted for World History - Period 5',
        timestamp: minutesAgo(120),
      },
    ],
  },
  {
    subject: 'science',
    stats: { averageGrade: 85, attendanceRate: 97, studentsNeedingIntervention: 1 },
    performanceTrend: [
      { label: 'Week 1', value: 80 },
      { label: 'Week 2', value: 82 },
      { label: 'Week 3', value: 84 },
      { label: 'Week 4', value: 83 },
      { label: 'Week 5', value: 86 },
      { label: 'Week 6', value: 85 },
    ],
    interventions: [
      {
        id: '4',
        name: 'Ava Thompson',
        className: 'Chemistry',
        reason: 'Attendance below 80%',
        severity: 'high',
      },
    ],
    assignments: [
      { id: '10', title: 'Stoichiometry Problem Set', dueDate: 'Nov 8', status: 'upcoming' },
      { id: '11', title: 'Lab Safety Quiz', dueDate: 'Oct 29', status: 'graded' },
    ],
    recentActivity: [
      {
        id: '6',
        description: '5 assignments pending grading',
        timestamp: minutesAgo(24 * 60),
      },
    ],
  },
  {
    subject: 'math',
    stats: { averageGrade: 80, attendanceRate: 93, studentsNeedingIntervention: 0 },
    performanceTrend: [
      { label: 'Week 1', value: 77 },
      { label: 'Week 2', value: 78 },
      { label: 'Week 3', value: 80 },
      { label: 'Week 4', value: 79 },
      { label: 'Week 5', value: 81 },
      { label: 'Week 6', value: 80 },
    ],
    interventions: [],
    assignments: [
      { id: '12', title: 'Triangle Proofs Worksheet', dueDate: 'Nov 9', status: 'upcoming' },
    ],
    recentActivity: [],
  },
]
