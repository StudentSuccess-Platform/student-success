import { useCallback, useEffect, useState } from 'react'

/**
 * Loads one API resource with the stored sign-in token.
 *
 * `fetcher(token)` must be a STABLE function: declare it at module level, or wrap a parameterized
 * call in useCallback, e.g. `useApiResource(useCallback((t) => getStudentProfile(t, id), [id]))`.
 * Returns `{ data, isLoading, error, reload }`. `reload()` refetches in the background and keeps the
 * current data on screen until the new response arrives (so forms and scroll position survive).
 */
function useApiResource(fetcher) {
  const [state, setState] = useState({ data: null, isLoading: true, error: null })
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    let token = null
    try {
      token = localStorage.getItem('authToken')
    } catch {
      // localStorage may be unavailable
    }

    fetcher(token)
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, isLoading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [fetcher, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return { ...state, reload }
}

export default useApiResource
