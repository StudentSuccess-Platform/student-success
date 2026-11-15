import useApiResource from '../../hooks/useApiResource'
import { getStudents } from '../../services/teacherStudentsApi'

/**
 * Supplies data for the Teacher "Students" list from `GET /api/v1/teacher/students`.
 *
 * @returns {{ data: ({ students: object[] }|null), isLoading: boolean, error: Error|null, reload: () => void }}
 */
function useTeacherStudentsData() {
  return useApiResource(getStudents)
}

export default useTeacherStudentsData
