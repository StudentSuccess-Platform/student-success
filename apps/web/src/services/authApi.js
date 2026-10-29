const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function handleResponse(response) {
  const data = await response.json()

  if (!response.ok) {
    const message = data.error || 'Something went wrong. Please try again.'
    throw new Error(message)
  }

  return data
}

export async function register({ email, password, role, firstName, lastName }) {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        role,
        firstName,
        lastName,
      }),
    })

    return await handleResponse(response)
  } catch (originalError) {
    if (originalError instanceof TypeError) {
      throw new Error('Network error. Please check your connection.', {
        cause: originalError,
      })
    }
    throw originalError
  }
}

export async function login({ email, password }) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    return await handleResponse(response)
  } catch (originalError) {
    if (originalError instanceof TypeError) {
      throw new Error('Network error. Please check your connection.', {
        cause: originalError,
      })
    }
    throw originalError
  }
}

export async function getMe(token) {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    return await handleResponse(response)
  } catch (originalError) {
    if (originalError instanceof TypeError) {
      throw new Error('Network error. Please check your connection.', {
        cause: originalError,
      })
    }
    throw originalError
  }
}
