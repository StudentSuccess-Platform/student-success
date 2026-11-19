import { useCallback } from 'react'
import useApiResource from '../../hooks/useApiResource'
import { getChildDashboard } from '../../services/parentApi'

/**
 * Supplies one linked child's dashboard from `GET /api/v1/parent/children/:studentId/dashboard`
 * (the same response shape as the student's own dashboard — see
 * `apps/api/src/services/students/studentViews.js`).
 *
 * `studentId` may be null while the caller is still resolving which child to show (e.g. the
 * linked-children list hasn't loaded yet) — in that case this resolves to `data: null` without
 * making a request, rather than firing one with an invalid id.
 *
 * @param {string|null} studentId
 * @returns {{ data: object|null, isLoading: boolean, error: Error|null }}
 */
function useParentDashboardData(studentId) {
  const fetcher = useCallback(
    (token) => (studentId ? getChildDashboard(studentId, token) : Promise.resolve(null)),
    [studentId]
  )
  return useApiResource(fetcher)
}

export default useParentDashboardData
