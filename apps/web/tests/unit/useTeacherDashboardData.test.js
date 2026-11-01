import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useTeacherDashboardData from '../../src/pages/teacher/useTeacherDashboardData'
import { getDashboard } from '../../src/services/teacherApi'
import {
  statsSummary,
  performanceTrend,
  attendanceOverview,
  interventions,
  recentActivity,
} from '../../src/pages/teacher/dashboardMockData'

vi.mock('../../src/services/teacherApi', () => ({
  getDashboard: vi.fn(),
  getClasses: vi.fn(),
}))

const payload = {
  summary: statsSummary,
  performanceTrend,
  attendanceOverview,
  interventions,
  recentActivity,
}

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useTeacherDashboardData', () => {
  it('starts loading, then resolves with the API payload', async () => {
    getDashboard.mockResolvedValue(payload)

    const { result } = renderHook(() => useTeacherDashboardData())

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(payload)
  })

  it('sends the stored sign-in token', async () => {
    localStorage.setItem('authToken', 'abc123')
    getDashboard.mockResolvedValue(payload)

    const { result } = renderHook(() => useTeacherDashboardData())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getDashboard).toHaveBeenCalledWith('abc123')
  })

  it('exposes the error when the request fails', async () => {
    getDashboard.mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useTeacherDashboardData())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toEqual(new Error('Unauthorized'))
  })
})
