import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'
import { API_URL, authHeaders, loginToken } from '../helpers/api.js'
import { openStudentProfile, sectionWithHeading } from '../helpers/teacher.js'

const JUDSON = 'Judson Greenfelder'
const PROFILE_SECTIONS = [
  'Grades',
  'Attendance',
  'Goals and Progress',
  'Teacher Feedback',
  'Performance Trend',
  'Remediation Plans',
]

test.describe('teacher students list and profile', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.teacher)
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)
  })

  test('the list shows the teacher\'s students with their own classes and intervention badges', async ({ page }) => {
    await page.getByRole('link', { name: 'Students', exact: true }).click()
    await expect(page).toHaveURL(/\/teacher\/students$/)
    await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible()

    const judson = page.getByRole('row').filter({ hasText: JUDSON })
    await expect(judson).toHaveCount(1)
    // Carley teaches Judson Algebra I; the English 9 class belongs to another teacher.
    await expect(judson).toContainText('Algebra I')
    await expect(judson).not.toContainText('English 9')

    await expect(page.getByText('Needs intervention').first()).toBeVisible()
  })

  test('the same student shows the classes of the teacher who is looking', async ({ browser }) => {
    const context = await browser.newContext()
    const sammie = await context.newPage()
    try {
      await signIn(sammie, ACCOUNTS.sammie)
      await expect(sammie).toHaveURL(/\/teacher\/dashboard$/)
      await sammie.getByRole('link', { name: 'Students', exact: true }).click()
      const judson = sammie.getByRole('row').filter({ hasText: JUDSON })
      await expect(judson).toContainText('English 9')
      await expect(judson).not.toContainText('Algebra I')
    } finally {
      await context.close()
    }
  })

  test('search filters the list by name and reports no matches', async ({ page }) => {
    await page.getByRole('link', { name: 'Students', exact: true }).click()
    const search = page.getByRole('searchbox', { name: 'Search students' })

    await search.fill('Judson')
    await expect(page.getByRole('link', { name: JUDSON, exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: JUDSON, exact: true })).toHaveCount(1)
    await expect(page.getByRole('row')).toHaveCount(2) // header row + Judson

    await search.fill('no-such-student-zzz')
    await expect(page.getByText('No students match your search.')).toBeVisible()
    await expect(page.getByRole('link', { name: JUDSON, exact: true })).toHaveCount(0)

    await search.fill('')
    await expect(page.getByRole('link', { name: JUDSON, exact: true })).toBeVisible()
  })

  test('opening a student shows every profile section and at least one grade', async ({ page }) => {
    await openStudentProfile(page, JUDSON)
    await expect(page).toHaveURL(/\/teacher\/students\/[0-9a-f]{24}$/)

    for (const heading of PROFILE_SECTIONS) {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('heading', { name: 'Enter Academic Records', exact: true })).toBeVisible()

    const grades = sectionWithHeading(page, 'Grades')
    await expect(grades.getByRole('row')).not.toHaveCount(1) // more than the header row
    await expect(grades.locator('tbody tr').first()).toBeVisible()
  })

  test('an unknown student id shows "Student not found" with a link back', async ({ page }) => {
    await page.goto('/teacher/students/000000000000000000000001')
    await expect(page.getByText('Student not found')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to students' })).toBeVisible()
  })

  test('a teacher cannot open a student who is not on their roster', async ({ page, request }) => {
    const carleyToken = await loginToken(request, ACCOUNTS.teacher)
    const sammieToken = await loginToken(request, ACCOUNTS.sammie)
    const roster = async (token) =>
      (await (await request.get(`${API_URL}/api/v1/teacher/students`, { headers: authHeaders(token) })).json())
        .students
    const carleyIds = new Set((await roster(carleyToken)).map((s) => s.id))
    const outsider = (await roster(sammieToken)).find((s) => !carleyIds.has(s.id))

    // The seed gives every student a class with both teachers, so no seeded student is on Sammie's
    // roster only. Skip rather than pass vacuously (see apps/web/tests/e2e/README.md).
    test.skip(!outsider, 'Seed has no student outside Carley\'s roster (see the e2e README).')

    await page.goto(`/teacher/students/${outsider.id}`)
    await expect(page.getByText('Student not found')).toBeVisible()
    await expect(page.getByRole('heading', { name: outsider.name, exact: true })).toHaveCount(0)
  })
})
