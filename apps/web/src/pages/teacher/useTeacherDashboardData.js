import useApiResource from '../../hooks/useApiResource'
import { getDashboard } from '../../services/teacherApi'

/**
 * Supplies data for the Teacher Dashboard from `GET /api/v1/teacher/dashboard`
 * (response shape documented in dashboardMockData.js).
 *
 * @returns {{ data: import('./dashboardMockData').TeacherDashboardData|null, isLoading: boolean, error: Error|null }}
 */
function useTeacherDashboardData() {
  return useApiResource(getDashboard)
}

export default useTeacherDashboardData
