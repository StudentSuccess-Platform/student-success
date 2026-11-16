import { request } from './http'

// Teacher endpoints. Shapes are documented in
// src/pages/teacher/dashboardMockData.js and classesMockData.js.

export function getDashboard(token) {
  return request('/api/v1/teacher/dashboard', { token })
}

export function getClasses(token) {
  return request('/api/v1/teacher/classes', { token })
}

export function getClassDetail(classId, token) {
  return request(`/api/v1/teacher/classes/${classId}`, { token })
}
