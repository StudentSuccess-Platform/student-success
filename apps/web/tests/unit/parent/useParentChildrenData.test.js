import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useParentChildrenData from '../../../src/pages/parent/useParentChildrenData'
import { getChildren } from '../../../src/services/parentApi'

vi.mock('../../../src/services/parentApi', () => ({
  getChildren: vi.fn(),
  getChildDashboard: vi.fn(),
}))

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useParentChildrenData', () => {
  it('resolves with the real linked-children list', async () => {
    const children = [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }]
    getChildren.mockResolvedValue({ children })
    const { result } = renderHook(() => useParentChildrenData())

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual({ children })
  })

  it('exposes the error when the request fails', async () => {
    getChildren.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useParentChildrenData())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toEqual(new Error('Network error'))
  })
})
