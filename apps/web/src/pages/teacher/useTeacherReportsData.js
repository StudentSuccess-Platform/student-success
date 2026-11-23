import useApiResource from '../../hooks/useApiResource'
import { listReports } from '../../services/teacherReportsApi'

/**
 * Supplies the signed-in teacher's progress reports and the count of each status from
 * `GET /api/v1/teacher/reports`. `reload()` refetches in the background after a change.
 *
 * @returns {{ data: ({ reports: object[], counts: { draft: number, pending_review: number, published: number } }|null),
 *            isLoading: boolean, error: Error|null, reload: () => void }}
 */
function useTeacherReportsData() {
  return useApiResource(listReports)
}

export default useTeacherReportsData
