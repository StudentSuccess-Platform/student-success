import { request } from './http'

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

// Every published support plan of the signed-in student, newest first. `active` marks the current plan of each class.
export async function getStudentSupportPlans(token) {
  const response = await fetch(`${API_URL}/api/v1/student/support-plans`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Unable to load your support plans (${response.status})`)
  }

  return response.json()
}

// The signed-in student's published progress reports, newest period first.
export function getStudentReports(token) {
  return request('/api/v1/student/reports', { token })
}
