import {
  statsSummary,
  performanceTrend,
  attendanceOverview,
  interventions,
  recentActivity,
} from './dashboardMockData'

/**
 * Supplies data for the Teacher Dashboard, shaped to match the proposed
 * `GET /api/teacher/dashboard` response (see dashboardMockData.js for the
 * documented contract).
 *
 * Currently backed by mock data and always resolved. This is the single
 * integration point for a real API call: swap the body for a fetch/query
 * hook that returns the same `{ data, isLoading, error }` shape, and no
 * other dashboard file needs to change.
 *
 * @returns {{ data: import('./dashboardMockData').TeacherDashboardData, isLoading: boolean, error: Error|null }}
 */
function useTeacherDashboardData() {
  return {
    data: {
      summary: statsSummary,
      performanceTrend,
      attendanceOverview,
      interventions,
      recentActivity,
    },
    isLoading: false,
    error: null,
  }
}

export default useTeacherDashboardData
