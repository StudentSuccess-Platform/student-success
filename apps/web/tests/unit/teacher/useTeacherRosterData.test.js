import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useTeacherRosterData from '../../../src/pages/teacher/useTeacherRosterData'
import { getClassDetail } from '../../../src/services/teacherApi'

vi.mock('../../../src/services/teacherApi', () => ({
  getClassDetail: vi.fn(),
}))

const classId = '507f1f77bcf86cd799439011'

const rosterResponse = {
  class: { id: classId, name: 'Algebra I', period: 'Period 2', room: 'Room 104' },
  students: [
    { id: 's1', name: 'Ada Strong', averageGrade: 95, attendanceRate: 100 },
    { id: 's2', name: 'Ben Behind', averageGrade: 50, attendanceRate: 0 },
  ],
  classAverage: 73,
}

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useTeacherRosterData', () => {
  it('resolves with the real roster for the requested class id', async () => {
    getClassDetail.mockResolvedValue(rosterResponse)
    const { result } = renderHook(() => useTeacherRosterData(classId))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(rosterResponse)
    expect(getClassDetail).toHaveBeenCalledWith(classId, null)
  })

  it('refetches when the class id changes', async () => {
    getClassDetail.mockResolvedValue(rosterResponse)
    const { result, rerender } = renderHook(({ id }) => useTeacherRosterData(id), {
      initialProps: { id: classId },
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const otherClassId = '507f1f77bcf86cd799439012'
    rerender({ id: otherClassId })
    await waitFor(() => expect(getClassDetail).toHaveBeenCalledWith(otherClassId, null))
  })

  it('exposes the error when the class is not this teacher’s own (real 404)', async () => {
    getClassDetail.mockRejectedValue(new Error('Class not found'))
    const { result } = renderHook(() => useTeacherRosterData(classId))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toEqual(new Error('Class not found'))
  })
})
