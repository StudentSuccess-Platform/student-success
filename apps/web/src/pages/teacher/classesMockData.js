/**
 * Mock data for the Teacher "My Classes" page, shaped to match the
 * proposed `GET /api/teacher/classes` response contract.
 *
 * @typedef {Object} TeacherClass
 * @property {string} id - opaque id (MongoDB ObjectId string)
 * @property {string} name
 * @property {string} period - e.g. "Period 2"
 * @property {string} room - e.g. "Room 104"
 * @property {number} studentCount
 *
 * @typedef {Object} TeacherClassesData
 * @property {TeacherClass[]} classes
 */

export const classes = [
  {
    id: '1',
    name: 'Algebra II',
    period: 'Period 2',
    room: 'Room 104',
    studentCount: 28,
  },
  {
    id: '2',
    name: 'AP Biology',
    period: 'Period 1',
    room: 'Lab B',
    studentCount: 22,
  },
  {
    id: '3',
    name: 'English Literature',
    period: 'Period 4',
    room: 'Room 205',
    studentCount: 31,
  },
  {
    id: '4',
    name: 'World History',
    period: 'Period 5',
    room: 'Room 112',
    studentCount: 26,
  },
  {
    id: '5',
    name: 'Chemistry',
    period: 'Period 3',
    room: 'Lab A',
    studentCount: 24,
  },
  {
    id: '6',
    name: 'Geometry',
    period: 'Period 6',
    room: 'Room 104',
    studentCount: 29,
  },
]
