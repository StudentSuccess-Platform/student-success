import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'
import { API_URL, BLAKE, authHeaders, loginToken, seededStudentAccount, uniqueText } from '../helpers/api.js'

// A student and a parent see a remediation plan only after the teacher publishes it (Blake Rowe and his parent). Setup runs
// through the API (faster and deterministic); the student's page is also checked in the browser.
const STUDENT_ID = BLAKE.id

async function teacherCall(request, token, method, path, data) {
  const res = await request.fetch(`${API_URL}/api/v1/teacher/students/${STUDENT_ID}${path}`, {
    method,
    headers: authHeaders(token),
    data,
  })
  expect(res.ok(), `${method} ${path} -> ${res.status()}`).toBeTruthy()
  return (await res.json()).plan
}

async function judsonSectionId(request, token) {
  const res = await request.get(`${API_URL}/api/v1/teacher/students/${STUDENT_ID}`, { headers: authHeaders(token) })
  return (await res.json()).classes[0].id
}

// The JSON a student or parent API returns, as text, so "does it mention this plan" is one check.
async function apiText(request, path, token) {
  const res = await request.get(`${API_URL}${path}`, { headers: authHeaders(token) })
  expect(res.ok(), `GET ${path} -> ${res.status()}`).toBeTruthy()
  return JSON.stringify(await res.json())
}

test.describe('unpublished remediation plans stay hidden from students and parents', () => {
  test('draft, pending review and approved plans are hidden until publish', async ({ request }) => {
    const teacher = await loginToken(request, ACCOUNTS.teacher)
    const studentAccount = await seededStudentAccount(request, BLAKE)
    const student = await loginToken(request, studentAccount)
    const parent = await loginToken(request, ACCOUNTS.parent)
    const studentView = () => apiText(request, '/api/v1/student/dashboard', student)
    const parentView = () => apiText(request, `/api/v1/parent/children/${STUDENT_ID}/dashboard`, parent)

    // Draft (manual plan).
    const title = uniqueText('Hidden plan')
    const draft = await teacherCall(request, teacher, 'POST', '/remediation', {
      sectionId: await judsonSectionId(request, teacher),
      title,
      rationale: 'Visibility check',
      items: [{ title: 'Visibility step' }],
    })
    expect(draft.status).toBe('draft')
    expect(await studentView()).not.toContain(title)
    expect(await parentView()).not.toContain(title)

    // Pending review (AI draft). The plan title comes from the response, so the check is exact.
    const ai = await teacherCall(request, teacher, 'POST', '/remediation/ai', {})
    expect(ai.status).toBe('pending_review')
    expect(await studentView()).not.toContain(ai.title)
    expect(await parentView()).not.toContain(ai.title)

    // Approved, not published.
    await teacherCall(request, teacher, 'POST', `/remediation/${draft.id}/approve`)
    expect(await studentView()).not.toContain(title)
    expect(await parentView()).not.toContain(title)

    // Published: now the student and the parent both see it.
    await teacherCall(request, teacher, 'POST', `/remediation/${draft.id}/publish`)
    expect(await studentView()).toContain(title)
    expect(await parentView()).toContain(title)
  })

  test('an unpublished draft is not shown on the student Support Plan page', async ({ page, request }) => {
    const teacher = await loginToken(request, ACCOUNTS.teacher)
    const title = uniqueText('Unpublished draft')
    await teacherCall(request, teacher, 'POST', '/remediation', {
      sectionId: await judsonSectionId(request, teacher),
      title,
      items: [],
    })

    await signIn(page, await seededStudentAccount(request, BLAKE))
    await expect(page).toHaveURL(/\/student\/dashboard$/)
    await page.goto('/student/support-plan')
    await expect(page.getByRole('heading', { name: 'Support Plan', exact: true })).toBeVisible()
    await expect(page.getByText(title)).toHaveCount(0)
  })
})
