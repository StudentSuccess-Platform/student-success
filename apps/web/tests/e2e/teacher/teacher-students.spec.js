import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'
import { API_URL, authHeaders, loginToken } from '../helpers/api.js'
import { openProfileTab, openStudentProfile, sectionWithHeading } from '../helpers/teacher.js'

const JUDSON = 'Judson Greenfelder'
// Each profile tab and the section headings it shows.
const PROFILE_TABS = {
  Overview: ['Performance Trend', 'At a glance'],
  Grades: ['Grades'],
  Attendance: ['Attendance'],
  'Goals & Feedback': ['Goals and Progress', 'Teacher Feedback'],
  'Support Plans': ['Remediation Plans'],
}

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

  test('opening a student shows the Overview tab, and every tab shows its sections', async ({ page }) => {
    await openStudentProfile(page, JUDSON)
    await expect(page).toHaveURL(/\/teacher\/students\/[0-9a-f]{24}$/)
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true')

    for (const [tab, headings] of Object.entries(PROFILE_TABS)) {
      await openProfileTab(page, tab)
      for (const heading of headings) {
        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      }
    }

    await openProfileTab(page, 'Grades')
    const grades = sectionWithHeading(page, 'Grades')
    await expect(grades.getByRole('row')).not.toHaveCount(1) // more than the header row
    await expect(grades.locator('tbody tr').first()).toBeVisible()
  })

  test('the open tab is kept in the URL, survives a reload and works with the keyboard', async ({ page }) => {
    await openStudentProfile(page, JUDSON)
    await openProfileTab(page, 'Attendance')
    await expect(page).toHaveURL(/\?tab=attendance$/)

    await page.reload()
    await expect(page.getByRole('tab', { name: 'Attendance', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Attendance', exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Attendance', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Goals & Feedback', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/\?tab=goals$/)
  })

  test('an unknown student id shows "Student not found" with a link back', async ({ page }) => {
    await page.goto('/teacher/students/000000000000000000000001')
    await expect(page.getByText('Student not found')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to students' })).toBeVisible()
  })

  test('a teacher cannot open a student who is not on their roster', async ({ browser, request }) => {
    // Carley and Sammie teach the same students, but Cheyenne teaches a single class, so some of
    // Carley's students are not on Cheyenne's roster.
    const roster = async (account) => {
      const token = await loginToken(request, account)
      const response = await request.get(`${API_URL}/api/v1/teacher/students`, { headers: authHeaders(token) })
      return (await response.json()).students
    }
    const cheyenneIds = new Set((await roster(ACCOUNTS.cheyenne)).map((s) => s.id))
    const outsider = (await roster(ACCOUNTS.teacher)).find((s) => !cheyenneIds.has(s.id))
    expect(outsider, 'expected a student on Carley\'s roster but not Cheyenne\'s').toBeTruthy()

    const context = await browser.newContext()
    const cheyenne = await context.newPage()
    try {
      await signIn(cheyenne, ACCOUNTS.cheyenne)
      await expect(cheyenne).toHaveURL(/\/teacher\/dashboard$/)
      await cheyenne.goto(`/teacher/students/${outsider.id}`)
      await expect(cheyenne.getByText('Student not found')).toBeVisible()
      await expect(cheyenne.getByRole('heading', { name: outsider.name, exact: true })).toHaveCount(0)
    } finally {
      await context.close()
    }
  })
})
