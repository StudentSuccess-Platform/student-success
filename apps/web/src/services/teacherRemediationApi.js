import { request } from './http'

// Teacher remediation plan endpoints (SCRUM-97). Plan JSON shape: docs/design/teacher-portal-mvp.md (B3, B4).

function authToken() {
  try {
    return localStorage.getItem('authToken')
  } catch {
    return null
  }
}

function remediationPath(studentId, suffix = '') {
  return `/api/v1/teacher/students/${encodeURIComponent(studentId)}/remediation${suffix}`
}

function planPath(studentId, planId, suffix = '') {
  return remediationPath(studentId, `/${encodeURIComponent(planId)}${suffix}`)
}

export function listPlans(studentId) {
  return request(remediationPath(studentId), { token: authToken() })
}

export function generateAiPlan(studentId, body = {}) {
  return request(remediationPath(studentId, '/ai'), { method: 'POST', body, token: authToken() })
}

export function createManualPlan(studentId, body) {
  return request(remediationPath(studentId), { method: 'POST', body, token: authToken() })
}

export function editPlan(studentId, planId, body) {
  return request(planPath(studentId, planId), { method: 'PUT', body, token: authToken() })
}

export function approvePlan(studentId, planId) {
  return request(planPath(studentId, planId, '/approve'), { method: 'POST', token: authToken() })
}

export function rejectPlan(studentId, planId, body = {}) {
  return request(planPath(studentId, planId, '/reject'), { method: 'POST', body, token: authToken() })
}

export function publishPlan(studentId, planId) {
  return request(planPath(studentId, planId, '/publish'), { method: 'POST', token: authToken() })
}
