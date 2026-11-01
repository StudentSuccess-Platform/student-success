import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useTeacherClassesData from '../../src/pages/teacher/useTeacherClassesData'
import { getClasses } from '../../src/services/teacherApi'
import { classes } from '../../src/pages/teacher/classesMockData'

vi.mock('../../src/services/teacherApi', () => ({
  getDashboard: vi.fn(),
  getClasses: vi.fn(),
}))

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useTeacherClassesData', () => {
  it('starts loading, then resolves with the classes from the API', async () => {
    getClasses.mockResolvedValue({ classes })

    const { result } = renderHook(() => useTeacherClassesData())

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual({ classes })
  })

  it('exposes the error when the request fails', async () => {
    getClasses.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTeacherClassesData())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
