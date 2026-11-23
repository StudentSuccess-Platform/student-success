import { request } from './http'

// Teacher progress report endpoints. Shapes are documented in docs/api/endpoints.md.

function authToken() {
  try {
    return localStorage.getItem('authToken')
  } catch {
    return null
  }
}

function reportsPath(studentId, suffix = '') {
  return `/api/v1/teacher/students/${encodeURIComponent(studentId)}/reports${suffix}`
}

// Every report of the signed-in teacher with counts by status. Used as a useApiResource fetcher.
export function listReports(token) {
  return request('/api/v1/teacher/reports', { token })
}

// The classes the teacher shares with a student (a report is written for one class).
export async function getStudentClasses(studentId) {
  const profile = await request(`/api/v1/teacher/students/${encodeURIComponent(studentId)}`, { token: authToken() })
  return profile.classes
}

// A factual starting summary built from the grades, attendance and goals of the period.
export function getSummarySuggestion(studentId, { sectionId, periodStart, periodEnd }) {
  const query = new URLSearchParams({ sectionId, periodStart, periodEnd })
  return request(reportsPath(studentId, `/suggestion?${query}`), { token: authToken() })
}

export function createReport(studentId, body) {
  return request(reportsPath(studentId), { method: 'POST', body, token: authToken() })
}

export function editReport(studentId, reportId, body) {
  return request(reportsPath(studentId, `/${encodeURIComponent(reportId)}`), { method: 'PUT', body, token: authToken() })
}

export function publishReport(studentId, reportId) {
  return request(reportsPath(studentId, `/${encodeURIComponent(reportId)}/publish`), { method: 'POST', token: authToken() })
}

export function deleteReport(studentId, reportId) {
  return request(reportsPath(studentId, `/${encodeURIComponent(reportId)}`), { method: 'DELETE', token: authToken() })
}
