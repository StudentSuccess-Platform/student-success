import { useCallback } from 'react'
import useApiResource from '../../hooks/useApiResource'
import { getChildSupportPlans } from '../../services/parentApi'

/**
 * Supplies one linked child's published support plans from
 * `GET /api/v1/parent/children/:studentId/support-plans` (the same response shape and
 * `status: "published"` filter as the student's own `GET /student/support-plans` — see
 * `apps/api/src/services/students/supportPlans.js`).
 *
 * `studentId` may be null while the caller is still resolving which child to show — in that
 * case this resolves to `data: null` without making a request, rather than firing one with an
 * invalid id.
 *
 * @param {string|null} studentId
 * @returns {{ data: ({ plans: object[] }|null), isLoading: boolean, error: Error|null }}
 */
function useParentSupportPlansData(studentId) {
  const fetcher = useCallback(
    (token) => (studentId ? getChildSupportPlans(studentId, token) : Promise.resolve(null)),
    [studentId]
  )
  return useApiResource(fetcher)
}

export default useParentSupportPlansData
