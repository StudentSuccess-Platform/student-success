import { useCallback } from 'react'
import useApiResource from '../../hooks/useApiResource'
import { getStudentProfile } from '../../services/teacherStudentsApi'

/**
 * Supplies data for the Teacher "Student Profile" page from
 * `GET /api/v1/teacher/students/:studentId`. A 404 surfaces as `error.status === 404`.
 *
 * @param {string} studentId
 * @returns {{ data: object|null, isLoading: boolean, error: Error|null, reload: () => void }}
 */
function useTeacherStudentProfile(studentId) {
  const fetchProfile = useCallback((token) => getStudentProfile(token, studentId), [studentId])

  return useApiResource(fetchProfile)
}

export default useTeacherStudentProfile
