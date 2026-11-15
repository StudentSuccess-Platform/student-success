export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Error thrown for any failed API call. `message` is the server's `{ error }` text (or a friendly
 * fallback), so existing callers that only show `error.message` keep working. Extra details:
 *   status    HTTP status (0 when the server could not be reached)
 *   fields    validation messages by field name, e.g. { pointsEarned: 'Required' } (400 responses)
 *   code      machine-readable code, e.g. 'AI_UNAVAILABLE' or 'AI_INVALID_RESPONSE'
 *   fallback  hint such as 'manual' when a feature offers a manual alternative
 */
export class ApiError extends Error {
  constructor(message, { status = 0, body = {}, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.fields = body.fields
    this.code = body.code
    this.fallback = body.fallback
  }
}

/**
 * Small fetch wrapper for the StudentSuccess API.
 *
 * Resolves with the parsed JSON body, or throws an ApiError carrying the server's `{ error }`
 * message (or a friendly fallback). Pass `token` to send a Bearer header.
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
    throw new ApiError('Network error. Please check your connection.', {
      status: 0,
      cause: originalError,
    })
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Please try again.', {
      status: response.status,
      body: data,
    })
  }

  return data
}
