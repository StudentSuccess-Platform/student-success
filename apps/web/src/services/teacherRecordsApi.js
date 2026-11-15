import { request } from './http'

// Teacher record entry endpoints (workstream B2). Shapes: docs/design/teacher-portal-mvp.md.
// `studentId` is a StudentProfile id (the `student.id` of the profile payload).

function readToken() {
  try {
    return localStorage.getItem('authToken')
  } catch {
    return null
  }
}

function studentPath(studentId) {
  return `/api/v1/teacher/students/${encodeURIComponent(studentId)}`
}

export function saveGrade(studentId, payload) {
  return request(`${studentPath(studentId)}/grades`, {
    method: 'PUT',
    body: payload,
    token: readToken(),
  })
}

export function saveAttendance(studentId, payload) {
  return request(`${studentPath(studentId)}/attendance`, {
    method: 'POST',
    body: payload,
    token: readToken(),
  })
}

export function createGoal(studentId, payload) {
  return request(`${studentPath(studentId)}/goals`, {
    method: 'POST',
    body: payload,
    token: readToken(),
  })
}

export function updateGoal(studentId, goalId, payload) {
  return request(`${studentPath(studentId)}/goals/${encodeURIComponent(goalId)}`, {
    method: 'PUT',
    body: payload,
    token: readToken(),
  })
}

export function addGoalUpdate(studentId, goalId, payload) {
  return request(`${studentPath(studentId)}/goals/${encodeURIComponent(goalId)}/updates`, {
    method: 'POST',
    body: payload,
    token: readToken(),
  })
}

export function createFeedback(studentId, payload) {
  return request(`${studentPath(studentId)}/feedback`, {
    method: 'POST',
    body: payload,
    token: readToken(),
  })
}

export function updateFeedback(studentId, feedbackId, payload) {
  return request(`${studentPath(studentId)}/feedback/${encodeURIComponent(feedbackId)}`, {
    method: 'PUT',
    body: payload,
    token: readToken(),
  })
}
