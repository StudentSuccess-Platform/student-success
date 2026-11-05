export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Small fetch wrapper for the StudentSuccess API.
 *
 * Resolves with the parsed JSON body, or throws an Error carrying the server's
 * `{ error }` message (or a friendly fallback). Pass `token` to send a Bearer header.
 */
export async function request(path, { method = 'GET', body, token } = {}) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (originalError) {
    throw new Error('Network error. Please check your connection.', {
      cause: originalError,
    })
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }

  return data
}
