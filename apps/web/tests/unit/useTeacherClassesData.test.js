import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import useTeacherClassesData from '../../src/pages/teacher/useTeacherClassesData'

describe('useTeacherClassesData', () => {
  it('resolves immediately with data matching the documented contract shape', () => {
    const { result } = renderHook(() => useTeacherClassesData())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(
      expect.objectContaining({
        classes: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            period: expect.any(String),
            room: expect.any(String),
            studentCount: expect.any(Number),
          }),
        ]),
      })
    )
  })
})
