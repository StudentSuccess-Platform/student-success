import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'
import { API_URL, BLAKE, authHeaders, loginToken, seededStudentAccount, uniqueText } from '../helpers/api.js'

// The student's Support Plan page and the student and parent plan-list endpoints: published plans only, the class and
// publish date on every plan, the newest plan of a class shown first, older plans kept behind a button.
// Setup goes through the teacher API (Blake Rowe); the checks run in the browser and against the list endpoints.

async function teacherPlanCall(request, token, method, path, data) {
  const res = await request.fetch(`${API_URL}/api/v1/teacher/students/${BLAKE.id}${path}`, {
    method,
    headers: authHeaders(token),
    data,
  })
  expect(res.ok(), `${method} ${path} -> ${res.status()}`).toBeTruthy()
  return (await res.json()).plan
}

async function publishManualPlan(request, token, sectionId, title) {
  const plan = await teacherPlanCall(request, token, 'POST', '/remediation', {
    sectionId,
    title,
    rationale: `Why: ${title}`,
    items: [{ title: `Step for ${title}` }],
  })
  await teacherPlanCall(request, token, 'POST', `/remediation/${plan.id}/approve`)
  await teacherPlanCall(request, token, 'POST', `/remediation/${plan.id}/publish`)
  return plan
}

test.describe('student support plans', () => {
  test('the page shows the newest plan with its class and publish date, and keeps the older one behind a button', async ({ page, request }) => {
    const teacher = await loginToken(request, ACCOUNTS.teacher)
    const account = await seededStudentAccount(request, BLAKE)
    const profile = await (await request.get(`${API_URL}/api/v1/teacher/students/${BLAKE.id}`, { headers: authHeaders(teacher) })).json()
    const { id: sectionId, name: className } = profile.classes[0]

    const olderTitle = uniqueText('Older plan')
    const newerTitle = uniqueText('Newer plan')
    await publishManualPlan(request, teacher, sectionId, olderTitle)
    await new Promise((resolve) => setTimeout(resolve, 20)) // distinct publish times
    await publishManualPlan(request, teacher, sectionId, newerTitle)
    const hidden = uniqueText('Draft plan')
    await teacherPlanCall(request, teacher, 'POST', '/remediation', { sectionId, title: hidden, rationale: 'Not published', items: [{ title: 'x' }] })

    await signIn(page, account)
    await expect(page).toHaveURL(/\/student\/dashboard$/)
    await page.getByRole('link', { name: 'Support Plan' }).click()
    await expect(page).toHaveURL(/\/student\/support-plan$/)

    // The current plan of the class: class name, publish date, teacher and goal. The older and draft plans are not shown.
    const card = page.getByRole('article', { name: `${className} support plan` })
    await expect(card).toHaveCount(1)
    await expect(card.getByRole('heading', { name: className, exact: true })).toBeVisible()
    await expect(card.getByRole('heading', { name: newerTitle })).toBeVisible()
    await expect(card.getByText(/^Published on [A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeVisible()
    await expect(card.getByText(/^Recommended by /)).toBeVisible()
    await expect(page.getByText(olderTitle)).toHaveCount(0)
    await expect(page.getByText(hidden)).toHaveCount(0)

    // Earlier plans stay hidden until asked for, then show with a label.
    const toggle = page.getByRole('button', { name: /^Show earlier plans/ })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(page.getByRole('heading', { name: olderTitle })).toBeVisible()
    await expect(page.getByText('Earlier plan').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Hide earlier plans' })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(hidden)).toHaveCount(0)

    await page.getByRole('button', { name: 'Hide earlier plans' }).click()
    await expect(page.getByText(olderTitle)).toHaveCount(0)
  })

  test('the student and parent endpoints list the same published plans, newest first, and nothing else', async ({ request }) => {
    const teacher = await loginToken(request, ACCOUNTS.teacher)
    const student = await loginToken(request, await seededStudentAccount(request, BLAKE))
    const parent = await loginToken(request, ACCOUNTS.parent)
    const profile = await (await request.get(`${API_URL}/api/v1/teacher/students/${BLAKE.id}`, { headers: authHeaders(teacher) })).json()
    const { id: sectionId, name: className } = profile.classes[0]

    const title = uniqueText('Listed plan')
    await publishManualPlan(request, teacher, sectionId, title)
    const draft = uniqueText('Unlisted draft')
    await teacherPlanCall(request, teacher, 'POST', '/remediation', { sectionId, title: draft, rationale: 'x', items: [{ title: 'x' }] })

    const own = await (await request.get(`${API_URL}/api/v1/student/support-plans`, { headers: authHeaders(student) })).json()
    const family = await (await request.get(`${API_URL}/api/v1/parent/children/${BLAKE.id}/support-plans`, { headers: authHeaders(parent) })).json()
    expect(family).toEqual(own)

    expect(own.plans[0]).toMatchObject({ title, className, active: true })
    expect(own.plans[0].publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(JSON.stringify(own)).not.toContain(draft)
    const dates = own.plans.map((p) => Date.parse(p.publishedAt))
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
    expect(own.plans.filter((p) => p.className === className && p.active)).toHaveLength(1)
    for (const hiddenField of ['version', 'reviewedBy', 'aiAuditId', 'status']) {
      expect(own.plans[0]).not.toHaveProperty(hiddenField)
    }
  })

  test('another student sees none of those plans, and a parent cannot read an unlinked child', async ({ request }) => {
    const teacher = await loginToken(request, ACCOUNTS.teacher)
    const judson = await loginToken(request, ACCOUNTS.student)
    const parent = await loginToken(request, ACCOUNTS.parent)

    const mine = await (await request.get(`${API_URL}/api/v1/student/support-plans`, { headers: authHeaders(judson) })).json()
    expect(mine.plans.every((p) => !p.title.startsWith('Newer plan') && !p.title.startsWith('Listed plan'))).toBe(true)

    const roster = (await (await request.get(`${API_URL}/api/v1/teacher/students`, { headers: authHeaders(teacher) })).json()).students
    const linked = (await (await request.get(`${API_URL}/api/v1/parent/children`, { headers: authHeaders(parent) })).json()).children.map((c) => c.id)
    const other = roster.find((s) => !linked.includes(s.id)) // the seeded parent has more than one child
    expect(other).toBeTruthy()
    const res = await request.get(`${API_URL}/api/v1/parent/children/${other.id}/support-plans`, { headers: authHeaders(parent) })
    expect(res.status()).toBe(404)

    // The roles are separate: a parent token cannot use the student route and the reverse.
    expect((await request.get(`${API_URL}/api/v1/student/support-plans`, { headers: authHeaders(parent) })).status()).toBe(403)
    expect((await request.get(`${API_URL}/api/v1/parent/children/${BLAKE.id}/support-plans`, { headers: authHeaders(judson) })).status()).toBe(403)
  })
})
