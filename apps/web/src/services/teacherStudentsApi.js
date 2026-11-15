import { request } from './http'

// Teacher student endpoints (B1). Response shapes are documented in
// docs/design/teacher-portal-mvp.md ("B1 roster and profile").

export function getStudents(token) {
  return request('/api/v1/teacher/students', { token })
}

export function getStudentProfile(token, id) {
  return request(`/api/v1/teacher/students/${encodeURIComponent(id)}`, { token })
}
