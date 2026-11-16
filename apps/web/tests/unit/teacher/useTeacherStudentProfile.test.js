import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useTeacherStudentProfile from '../../../src/pages/teacher/useTeacherStudentProfile'
import { ApiError } from '../../../src/services/http'
import { getStudentProfile } from '../../../src/services/teacherStudentsApi'

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(),
  getStudentProfile: vi.fn(),
}))

const profile = {
  student: { id: 'stu1', name: 'Ada Lovelace', gradeLevel: 10, studentNumber: 'S-1001' },
  classes: [],
  summary: { averageGrade: null, attendanceRate: null, needsIntervention: false, reason: null },
  grades: [],
  attendance: { rate: null, records: [] },
  goals: [],
  feedback: [],
  performanceTrend: [],
}

beforeEach(() => {
  localStorage.setItem('authToken', 'teacher-token')
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useTeacherStudentProfile', () => {
  it('fetches the profile for the given id with the stored token', async () => {
    getStudentProfile.mockResolvedValue(profile)

    const { result } = renderHook(() => useTeacherStudentProfile('stu1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(getStudentProfile).toHaveBeenCalledWith('teacher-token', 'stu1')
    expect(result.current.data).toEqual(profile)
    expect(result.current.error).toBeNull()
  })

  it('fetches again only when the student id changes', async () => {
    getStudentProfile.mockResolvedValue(profile)

    const { result, rerender } = renderHook(({ id }) => useTeacherStudentProfile(id), {
      initialProps: { id: 'stu1' },
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    rerender({ id: 'stu1' })
    expect(getStudentProfile).toHaveBeenCalledTimes(1)

    rerender({ id: 'stu2' })
    await waitFor(() => expect(getStudentProfile).toHaveBeenCalledTimes(2))
    expect(getStudentProfile).toHaveBeenLastCalledWith('teacher-token', 'stu2')
  })

  it('returns the error with its status when the student is not found', async () => {
    getStudentProfile.mockRejectedValue(new ApiError('Student not found', { status: 404 }))

    const { result } = renderHook(() => useTeacherStudentProfile('missing'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error.status).toBe(404)
  })

  it('keeps reload stable across renders and refetches the same profile', async () => {
    getStudentProfile.mockResolvedValue(profile)

    const { result, rerender } = renderHook(() => useTeacherStudentProfile('stu1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const firstReload = result.current.reload
    rerender()
    expect(result.current.reload).toBe(firstReload)

    result.current.reload()
    await waitFor(() => expect(getStudentProfile).toHaveBeenCalledTimes(2))
    expect(getStudentProfile).toHaveBeenLastCalledWith('teacher-token', 'stu1')
  })
})
