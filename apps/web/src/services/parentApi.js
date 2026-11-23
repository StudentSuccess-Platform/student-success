import { request } from './http'

// Parent endpoints. Shapes are documented in docs/api/endpoints.md.

export function getChildren(token) {
  return request('/api/v1/parent/children', { token })
}

export function getChildDashboard(studentId, token) {
  return request(`/api/v1/parent/children/${studentId}/dashboard`, { token })
}

export function getChildSupportPlans(studentId, token) {
  return request(`/api/v1/parent/children/${studentId}/support-plans`, { token })
}

// One linked child's published progress reports, newest period first.
export function getChildReports(studentId, token) {
  return request(`/api/v1/parent/children/${studentId}/reports`, { token })
}
