import useApiResource from '../../hooks/useApiResource'
import { getClasses } from '../../services/teacherApi'

/**
 * Supplies data for the Teacher "My Classes" page from `GET /api/v1/teacher/classes`
 * (response shape documented in classesMockData.js).
 *
 * @returns {{ data: import('./classesMockData').TeacherClassesData|null, isLoading: boolean, error: Error|null }}
 */
function useTeacherClassesData() {
  return useApiResource(getClasses)
}

export default useTeacherClassesData
