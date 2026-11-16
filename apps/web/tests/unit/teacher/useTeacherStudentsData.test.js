import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useTeacherStudentsData from '../../../src/pages/teacher/useTeacherStudentsData'
import { getStudents } from '../../../src/services/teacherStudentsApi'

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(),
  getStudentProfile: vi.fn(),
}))

const payload = {
  students: [
    {
      id: 'stu1',
      name: 'Ada Lovelace',
      gradeLevel: 10,
      classNames: ['Algebra I'],
      averageGrade: 72,
      attendanceRate: 90,
      needsIntervention: true,
    },
  ],
}

beforeEach(() => {
  localStorage.setItem('authToken', 'teacher-token')
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useTeacherStudentsData', () => {
  it('fetches the roster with the stored token and returns it', async () => {
    getStudents.mockResolvedValue(payload)

    const { result } = renderHook(() => useTeacherStudentsData())

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getStudents).toHaveBeenCalledWith('teacher-token')
    expect(result.current.data).toEqual(payload)
    expect(result.current.error).toBeNull()
  })

  it('returns the error when the roster cannot be loaded', async () => {
    const failure = new Error('boom')
    getStudents.mockRejectedValue(failure)

    const { result } = renderHook(() => useTeacherStudentsData())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe(failure)
  })

  it('keeps reload stable across renders and refetches when called', async () => {
    getStudents.mockResolvedValue(payload)

    const { result, rerender } = renderHook(() => useTeacherStudentsData())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const firstReload = result.current.reload
    rerender()
    expect(result.current.reload).toBe(firstReload)

    result.current.reload()
    await waitFor(() => expect(getStudents).toHaveBeenCalledTimes(2))
  })
})
