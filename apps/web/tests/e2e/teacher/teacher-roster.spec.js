import { test, expect } from '@playwright/test'
import { ACCOUNTS, PASSWORD, signIn } from '../helpers/auth.js'
import { API_URL, authHeaders, loginToken, uniqueText } from '../helpers/api.js'
import { openProfileTab, openStudentProfile } from '../helpers/teacher.js'

// Adding a student to a class through the API (the roster form calls POST /teacher/classes/:id/students),
// then checking what the teacher sees in the browser. A student added this way has no email and no login yet.

async function firstClass(request, token, name) {
  const res = await request.get(`${API_URL}/api/v1/teacher/classes`, { headers: authHeaders(token) })
  return (await res.json()).classes.find((c) => c.name === name)
}

// Letters only (a name field), and unique per run so the duplicate guard does not trip on an earlier run.
function uniqueName(prefix) {
  return prefix + uniqueText('').replace(/\d/g, (d) => 'abcdefghij'[d]).replace(/[^A-Za-z]/g, '')
}

function addStudent(request, token, classId, data) {
  return request.post(`${API_URL}/api/v1/teacher/classes/${classId}/students`, { headers: authHeaders(token), data })
}

test.describe('teacher roster: adding a student without an email', () => {
  test('the new student shows in the list and opens as a full profile, and has no login', async ({ page, request }) => {
    const token = await loginToken(request, ACCOUNTS.cheyenne)
    const history = await firstClass(request, token, 'World History')
    const firstName = uniqueName('Newkid')
    const lastName = 'Rosterly'
    const name = `${firstName} ${lastName}`

    const res = await addStudent(request, token, history.id, { firstName, lastName, gradeLevel: 9 })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.student).toMatchObject({ name, hasEmail: false, accountStatus: 'invited' })

    await signIn(page, ACCOUNTS.cheyenne)
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)

    // Students list: the new student appears with World History.
    await page.getByRole('link', { name: 'Students', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Search students' }).fill(firstName)
    const row = page.getByRole('row').filter({ hasText: name })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('World History')

    // The profile opens and every tab renders for a student with no records yet.
    await openStudentProfile(page, name)
    for (const tab of ['Grades', 'Attendance', 'Goals & Feedback', 'Support Plans', 'Overview']) {
      await openProfileTab(page, tab)
      await expect(page.getByRole('alert')).toHaveCount(0)
    }

    // No email, no password: there is nothing to sign in with.
    const login = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: `${firstName}.${lastName}@example.test`.toLowerCase(), password: PASSWORD },
    })
    expect(login.status()).toBe(401)
  })

  test('a student with the same name and grade is blocked until the teacher confirms', async ({ request }) => {
    const token = await loginToken(request, ACCOUNTS.cheyenne)
    const history = await firstClass(request, token, 'World History')
    const firstName = uniqueName('Twin')
    const person = { firstName, lastName: 'Duplicate', gradeLevel: 10 }

    const first = await addStudent(request, token, history.id, person)
    expect(first.status()).toBe(201)
    const created = (await first.json()).student

    const blocked = await addStudent(request, token, history.id, { ...person, firstName: firstName.toUpperCase() })
    expect(blocked.status()).toBe(409)
    const blockedBody = await blocked.json()
    expect(blockedBody.code).toBe('POSSIBLE_DUPLICATE')
    expect(blockedBody.matches.map((m) => m.id)).toEqual([created.id])
    expect(blockedBody.matches[0].alreadyInClass).toBe(true)

    // A different grade is a different student; a confirmed duplicate is created; the same child is not re-added.
    expect((await addStudent(request, token, history.id, { ...person, gradeLevel: 11 })).status()).toBe(201)
    expect((await addStudent(request, token, history.id, { ...person, allowDuplicate: true })).status()).toBe(201)
    const again = await addStudent(request, token, history.id, { ...person, existingStudentId: created.id })
    expect(again.status()).toBe(409)
    expect((await again.json()).code).toBe('ALREADY_ENROLLED')
  })

  test('another teacher cannot add to this class or see the new student', async ({ request }) => {
    const token = await loginToken(request, ACCOUNTS.cheyenne)
    const carley = await loginToken(request, ACCOUNTS.teacher)
    const history = await firstClass(request, token, 'World History')
    const firstName = uniqueName('Hidden')

    expect((await addStudent(request, carley, history.id, { firstName, lastName: 'Kid', gradeLevel: 9 })).status()).toBe(404)
    const created = await (await addStudent(request, token, history.id, { firstName, lastName: 'Kid', gradeLevel: 9 })).json()
    const res = await request.get(`${API_URL}/api/v1/teacher/students/${created.student.id}`, { headers: authHeaders(carley) })
    expect(res.status()).toBe(404)
  })
})
