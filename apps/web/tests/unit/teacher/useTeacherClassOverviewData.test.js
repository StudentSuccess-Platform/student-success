import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useTeacherClassOverviewData from '../../../src/pages/teacher/useTeacherClassOverviewData'
import { getClasses } from '../../../src/services/teacherApi'

vi.mock('../../../src/services/teacherApi', () => ({
  getDashboard: vi.fn(),
  getClasses: vi.fn(),
}))

const realClasses = [
  { id: '507f1f77bcf86cd799439011', name: 'Algebra I', period: 'Period 2', room: 'Room 104', studentCount: 28 },
  { id: '507f1f77bcf86cd799439012', name: 'Geometry', period: 'Period 6', room: 'Room 104', studentCount: 29 },
]

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useTeacherClassOverviewData', () => {
  it('resolves with the real class header from the teacher classes API', async () => {
    getClasses.mockResolvedValue({ classes: realClasses })
    const { result } = renderHook(() => useTeacherClassOverviewData(realClasses[0].id))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(
      expect.objectContaining({
        classInfo: realClasses[0],
        isDemoData: true,
        stats: expect.objectContaining({
          averageGrade: expect.any(Number),
          attendanceRate: expect.any(Number),
          studentsNeedingIntervention: expect.any(Number),
        }),
        performanceTrend: expect.any(Array),
        interventions: expect.any(Array),
        assignments: expect.any(Array),
        recentActivity: expect.any(Array),
      })
    )
  })

  it('resolves class-specific headers for each real class id, and the same demo content for a given id every time', async () => {
    getClasses.mockResolvedValue({ classes: realClasses })

    const first = renderHook(() => useTeacherClassOverviewData(realClasses[0].id))
    await waitFor(() => expect(first.result.current.isLoading).toBe(false))
    const second = renderHook(() => useTeacherClassOverviewData(realClasses[1].id))
    await waitFor(() => expect(second.result.current.isLoading).toBe(false))
    const firstAgain = renderHook(() => useTeacherClassOverviewData(realClasses[0].id))
    await waitFor(() => expect(firstAgain.result.current.isLoading).toBe(false))

    expect(first.result.current.data.classInfo).toEqual(realClasses[0])
    expect(second.result.current.data.classInfo).toEqual(realClasses[1])
    expect(firstAgain.result.current.data.stats).toEqual(first.result.current.data.stats)
    expect(firstAgain.result.current.data.performanceTrend).toEqual(
      first.result.current.data.performanceTrend
    )
  })

  it('resolves with data: null and no error when the id is not one of this teacher’s own classes', async () => {
    getClasses.mockResolvedValue({ classes: realClasses })
    const { result } = renderHook(() =>
      useTeacherClassOverviewData('507f1f77bcf86cd799439099')
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('exposes the error when the teacher classes request fails', async () => {
    getClasses.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useTeacherClassOverviewData(realClasses[0].id))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toEqual(new Error('Network error'))
  })

  describe('subject-appropriate demo content', () => {
    const NON_MATH_TITLES = [
      'Essay: Symbolism in The Great Gatsby',
      'Reading Journal - Ch. 1-5',
      'Treaty of Versailles Essay',
      'Unit 4 Test',
      'Cell Structure Lab Report',
      'Genetics Problem Set',
      'Stoichiometry Problem Set',
      'Lab Safety Quiz',
    ]

    it.each([
      ['507f1f77bcf86cd799439011', 'Algebra I'],
      ['507f1f77bcf86cd799439012', 'Geometry'],
      ['507f1f77bcf86cd799439013', 'Algebra II'],
      ['507f1f77bcf86cd799439099', 'AP Calculus'],
    ])('gives a math class (%s %s) only math-subject demo assignments', async (id, name) => {
      getClasses.mockResolvedValue({ classes: [{ id, name, period: 'Period 1', room: 'Room 1', studentCount: 20 }] })
      const { result } = renderHook(() => useTeacherClassOverviewData(id))
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const titles = result.current.data.assignments.map((a) => a.title)
      for (const title of titles) {
        expect(NON_MATH_TITLES).not.toContain(title)
      }
    })

    it('relabels each intervention entry with the real class name, not the template’s own sample class name', async () => {
      getClasses.mockResolvedValue({ classes: [realClasses[0]] })
      const { result } = renderHook(() => useTeacherClassOverviewData(realClasses[0].id))
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      for (const student of result.current.data.interventions) {
        expect(student.className).toBe(realClasses[0].name)
      }
    })

    it('falls back to the full template pool for a class name that matches no known subject', async () => {
      const unmatched = { id: '507f1f77bcf86cd799439050', name: 'Study Hall', period: 'Period 7', room: 'Room 1', studentCount: 15 }
      getClasses.mockResolvedValue({ classes: [unmatched] })
      const { result } = renderHook(() => useTeacherClassOverviewData(unmatched.id))
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data.assignments.length).toBeGreaterThan(0)
    })
  })
})
