import { useCallback } from 'react'
import useApiResource from '../../hooks/useApiResource'
import { getChildReports } from '../../services/parentApi'

/**
 * Supplies one linked child's published progress reports from
 * `GET /api/v1/parent/children/:studentId/reports` (the same list as the student's own
 * `GET /student/reports`).
 *
 * `studentId` may be null while the caller is still resolving which child to show; in that case this
 * resolves to `data: null` without making a request.
 *
 * @param {string|null} studentId
 * @returns {{ data: ({ reports: object[] }|null), isLoading: boolean, error: Error|null }}
 */
function useParentReportsData(studentId) {
  const fetcher = useCallback(
    (token) => (studentId ? getChildReports(studentId, token) : Promise.resolve(null)),
    [studentId]
  )
  return useApiResource(fetcher)
}

export default useParentReportsData
