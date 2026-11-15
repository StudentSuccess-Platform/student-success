import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useApiResource from '../../../src/hooks/useApiResource'

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useApiResource', () => {
  it('loads data with the stored token', async () => {
    localStorage.setItem('authToken', 'abc')
    const fetcher = vi.fn().mockResolvedValue({ n: 1 })

    const { result } = renderHook(() => useApiResource(fetcher))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual({ n: 1 })
    expect(fetcher).toHaveBeenCalledWith('abc')
  })

  it('exposes the error and clears data when the request fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('nope'))

    const { result } = renderHook(() => useApiResource(fetcher))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toEqual(new Error('nope'))
  })

  it('reload() refetches and keeps the current data until the new response arrives', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ n: 1 }).mockResolvedValueOnce({ n: 2 })

    const { result } = renderHook(() => useApiResource(fetcher))
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }))

    act(() => result.current.reload())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toEqual({ n: 1 })
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not refetch on re-render when the fetcher is stable', async () => {
    const fetcher = vi.fn().mockResolvedValue({ n: 1 })

    const { result, rerender } = renderHook(() => useApiResource(fetcher))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    rerender()
    rerender()

    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
