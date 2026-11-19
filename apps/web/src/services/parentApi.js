import { request } from './http'

// Parent endpoints. Shapes are documented in docs/api/endpoints.md.

export function getChildren(token) {
  return request('/api/v1/parent/children', { token })
}

export function getChildDashboard(studentId, token) {
  return request(`/api/v1/parent/children/${studentId}/dashboard`, { token })
}
