import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import useTeacherDashboardData from '../../src/pages/teacher/useTeacherDashboardData'

describe('useTeacherDashboardData', () => {
  it('resolves immediately with data matching the documented contract shape', () => {
    const { result } = renderHook(() => useTeacherDashboardData())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()

    expect(result.current.data).toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          totalClasses: expect.any(Number),
          totalStudents: expect.any(Number),
          studentsNeedingIntervention: expect.any(Number),
          averageAttendance: expect.any(Number),
        }),
        performanceTrend: expect.any(Array),
        attendanceOverview: expect.objectContaining({
          overallRate: expect.any(Number),
          classes: expect.any(Array),
        }),
        interventions: expect.any(Array),
        recentActivity: expect.any(Array),
      })
    )
  })
})
