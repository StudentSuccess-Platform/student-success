import { useCallback } from 'react'
import useApiResource from '../../hooks/useApiResource'
import { getClassDetail } from '../../services/teacherApi'

/**
 * Supplies data for the Teacher Class Roster tab from the real
 * `GET /api/v1/teacher/classes/:classId` response — the same endpoint
 * `ClassDetail`'s roster table (SCRUM-144) is built on. Unlike
 * `useTeacherClassOverviewData`, this calls the endpoint for the one
 * requested class directly, so a class that isn't this teacher's own comes
 * back as a real 404 and surfaces here as `error`, not a separate
 * not-found state.
 *
 * @param {string} classId
 * @returns {{ data: ({ class: { id: string, name: string, period: string, room: string }, students: { id: string, name: string, averageGrade: number, attendanceRate: number }[], classAverage: number|null }|null), isLoading: boolean, error: Error|null }}
 */
function useTeacherRosterData(classId) {
  const fetcher = useCallback((token) => getClassDetail(classId, token), [classId])
  return useApiResource(fetcher)
}

export default useTeacherRosterData
