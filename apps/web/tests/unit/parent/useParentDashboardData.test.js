import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useParentDashboardData from '../../../src/pages/parent/useParentDashboardData'
import { getChildDashboard } from '../../../src/services/parentApi'

vi.mock('../../../src/services/parentApi', () => ({
  getChildren: vi.fn(),
  getChildDashboard: vi.fn(),
}))

const dashboard = {
  student: { id: 's1', firstName: 'Liam', term: 'Fall 2026' },
  summary: { currentGrade: 84, attendance: 94 },
  grades: [],
  performanceTrend: [],
  goals: [],
  teacherFeedback: null,
  feedbackHistory: [],
  supportPlan: null,
}

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useParentDashboardData', () => {
  it('resolves with the real dashboard for the given student id', async () => {
    getChildDashboard.mockResolvedValue(dashboard)
    const { result } = renderHook(() => useParentDashboardData('s1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(dashboard)
    expect(getChildDashboard).toHaveBeenCalledWith('s1', null)
  })

  it('does not call the API when studentId is null, and resolves with no data', async () => {
    const { result } = renderHook(() => useParentDashboardData(null))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
    expect(getChildDashboard).not.toHaveBeenCalled()
  })

  it('refetches when studentId changes from null to a real id', async () => {
    getChildDashboard.mockResolvedValue(dashboard)
    const { result, rerender } = renderHook(({ id }) => useParentDashboardData(id), {
      initialProps: { id: null },
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(getChildDashboard).not.toHaveBeenCalled()

    rerender({ id: 's1' })
    await waitFor(() => expect(getChildDashboard).toHaveBeenCalledWith('s1', null))
  })

  it('exposes the error when the request fails', async () => {
    getChildDashboard.mockRejectedValue(new Error('Class not found'))
    const { result } = renderHook(() => useParentDashboardData('s1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toEqual(new Error('Class not found'))
  })
})
