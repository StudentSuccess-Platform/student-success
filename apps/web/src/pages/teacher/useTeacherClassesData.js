import { classes } from './classesMockData'

/**
 * Supplies data for the Teacher "My Classes" page, shaped to match the
 * proposed `GET /api/teacher/classes` response (see classesMockData.js
 * for the documented contract).
 *
 * Currently backed by mock data and always resolved. Mirrors the same
 * `{ data, isLoading, error }` seam as useTeacherDashboardData.js — swap
 * the body for a real fetch/query hook and nothing else needs to change.
 *
 * @returns {{ data: import('./classesMockData').TeacherClassesData, isLoading: boolean, error: Error|null }}
 */
function useTeacherClassesData() {
  return {
    data: { classes },
    isLoading: false,
    error: null,
  }
}

export default useTeacherClassesData
