
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function getStudentDashboard(token) {
  const response = await fetch(
    `${API_URL}/api/student/me/dashboard`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      `Unable to load student dashboard (${response.status})`
    )
  }

  return response.json()
}
