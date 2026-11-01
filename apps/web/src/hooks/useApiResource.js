import { useEffect, useState } from 'react'

/**
 * Loads one API resource with the stored sign-in token.
 *
 * `fetcher(token)` must be a stable function (declare it at module level) so the
 * request runs once per mount. Returns the `{ data, isLoading, error }` shape the
 * page views already expect.
 */
function useApiResource(fetcher) {
  const [state, setState] = useState({ data: null, isLoading: true, error: null })

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
  }, [fetcher])

  return state
}

export default useApiResource
