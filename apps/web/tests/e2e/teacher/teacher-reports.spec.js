import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'
import { API_URL, authHeaders, loginToken, uniqueText } from '../helpers/api.js'

// Progress reports: a teacher writes one (with a suggested summary), publishes it after confirming, and only then do
// the student and the linked parent see it. Judson Greenfelder is Carley's student and Lorena's child.
const JUDSON = 'Judson Greenfelder'

async function openReports(page) {
  await page.getByRole('link', { name: 'Reports', exact: true }).click()
  await expect(page).toHaveURL(/\/teacher\/reports$/)
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
}

// Fills the new report form for Judson. Returns once the draft is saved and listed.
async function writeReport(page, summary) {
  await page.getByRole('button', { name: 'New report' }).click()
  const form = page.getByRole('form', { name: 'New report' })
  await form.getByLabel('Student').selectOption({ label: JUDSON })
  await expect(form.getByLabel('Class')).not.toHaveValue('') // a single class is chosen for the student
  await form.getByLabel('Period start').fill('2025-09-01')
  await form.getByLabel('Period end').fill('2025-11-14')
  await form.getByLabel('Summary').fill(summary)
  await form.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByRole('form', { name: 'New report' })).toHaveCount(0)
  return page.getByRole('article').filter({ hasText: summary })
}

test.describe('teacher reports', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.teacher)
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)
  })

  test('the Reports page lists the teacher\'s reports with counts and a status filter', async ({ page }) => {
    await openReports(page)

    await expect(page.getByLabel('Report counts')).toContainText(/\d+ drafts? · \d+ published/)
    await expect(page.getByRole('article').first()).toBeVisible()

    await page.getByLabel('Show').selectOption('published')
    const published = page.getByRole('article')
    await expect(published.first()).toBeVisible()
    const count = await published.count()
    for (let i = 0; i < count; i += 1) {
      await expect(published.nth(i).getByText('Published', { exact: true }).first()).toBeVisible()
    }
  })

  test('submitting an empty form names the missing fields and saves nothing', async ({ page }) => {
    await openReports(page)
    await page.getByRole('button', { name: 'New report' }).click()
    const form = page.getByRole('form', { name: 'New report' })

    await form.getByRole('button', { name: 'Save draft' }).click()

    for (const message of ['Student is required', 'Class is required', 'Start date is required', 'End date is required', 'Summary is required']) {
      await expect(form.getByText(message)).toBeVisible()
    }
    await form.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('form', { name: 'New report' })).toHaveCount(0)
  })

  test('a suggested summary is built from the student\'s data and can be edited before saving', async ({ page }) => {
    await openReports(page)
    await page.getByRole('button', { name: 'New report' }).click()
    const form = page.getByRole('form', { name: 'New report' })
    await form.getByLabel('Student').selectOption({ label: JUDSON })
    await expect(form.getByLabel('Class')).not.toHaveValue('')
    await form.getByLabel('Period start').fill('2025-09-01')
    await form.getByLabel('Period end').fill('2025-11-14')

    await form.getByRole('button', { name: 'Suggest summary' }).click()

    const summary = form.getByLabel('Summary')
    await expect(summary).toHaveValue(/average grade is \d+%/)
    await expect(summary).toHaveValue(/Attendance is \d+%/)
    await summary.fill(`${await summary.inputValue()} Edited by the teacher.`)
    await expect(summary).toHaveValue(/Edited by the teacher\.$/)
  })

  test('a report is a draft until it is published after confirming, and only then do the student and the parent see it', async ({ page, browser, request }) => {
    const summary = uniqueText('E2E report')
    const draftSummary = uniqueText('E2E draft that stays hidden')

    await openReports(page)
    const card = await writeReport(page, summary)
    await expect(card.getByText('Draft', { exact: true })).toBeVisible()
    const hidden = await writeReport(page, draftSummary)
    await expect(hidden.getByText('Draft', { exact: true })).toBeVisible()

    // Not visible to the student while it is a draft.
    const studentToken = await loginToken(request, ACCOUNTS.student)
    const before = await (await request.get(`${API_URL}/api/v1/student/reports`, { headers: authHeaders(studentToken) })).json()
    expect(JSON.stringify(before)).not.toContain(summary)

    // Publishing asks first, and cancelling changes nothing.
    await card.getByRole('button', { name: 'Publish' }).click()
    await expect(card.getByRole('group', { name: 'Confirm publish' })).toContainText('linked parents will be able to read it')
    await card.getByRole('button', { name: 'Cancel' }).click()
    await expect(card.getByText('Draft', { exact: true })).toBeVisible()

    await card.getByRole('button', { name: 'Publish' }).click()
    await card.getByRole('button', { name: 'Confirm publish' }).click()
    await expect(card.getByText('Published', { exact: true }).first()).toBeVisible()
    await expect(card.getByRole('button', { name: 'Edit' })).toHaveCount(0)
    await expect(card.getByRole('button', { name: 'Publish' })).toHaveCount(0)

    // The student sees the published report and not the draft.
    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    try {
      await signIn(student, ACCOUNTS.student)
      await expect(student).toHaveURL(/\/student\/dashboard$/)
      await student.getByRole('link', { name: 'Progress Reports' }).click()
      await expect(student).toHaveURL(/\/student\/reports$/)
      const studentCard = student.getByRole('article').filter({ hasText: summary })
      await expect(studentCard).toHaveCount(1)
      await expect(studentCard.getByRole('heading', { name: 'Algebra I' })).toBeVisible()
      await expect(studentCard.getByText(/^By Carley Beer$/)).toBeVisible()
      await expect(studentCard.getByText(/^Published [A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeVisible()
      await expect(student.getByText(draftSummary)).toHaveCount(0)
    } finally {
      await studentContext.close()
    }

    // The linked parent sees it for this child.
    const parentContext = await browser.newContext()
    const parent = await parentContext.newPage()
    try {
      await signIn(parent, ACCOUNTS.parent)
      await expect(parent).toHaveURL(/\/parent/)
      await parent.getByRole('link', { name: 'Progress Reports' }).click()
      await expect(parent).toHaveURL(/\/parent\/reports$/)
      await parent.getByLabel(/viewing/i).selectOption({ label: JUDSON })
      await expect(parent.getByText(summary)).toBeVisible()
      await expect(parent.getByText(draftSummary)).toHaveCount(0)
    } finally {
      await parentContext.close()
    }

    // The draft that was never published can be deleted, after confirming.
    await hidden.getByRole('button', { name: 'Delete' }).click()
    await expect(hidden.getByText('Delete this draft? This cannot be undone.')).toBeVisible()
    await hidden.getByRole('button', { name: 'Confirm delete' }).click()
    await expect(page.getByText(draftSummary)).toHaveCount(0)
  })

  test('a draft can be edited from its card', async ({ page }) => {
    const summary = uniqueText('E2E edit me')
    await openReports(page)
    const card = await writeReport(page, summary)

    await card.getByRole('button', { name: 'Edit' }).click()
    const form = page.getByRole('form', { name: 'Edit report' })
    await expect(form.getByLabel('Summary')).toHaveValue(summary)
    await form.getByLabel('Summary').fill(`${summary} (revised)`)
    await form.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByText(`${summary} (revised)`)).toBeVisible()
    await expect(page.getByRole('form', { name: 'Edit report' })).toHaveCount(0)
  })

  test('another teacher cannot read or change this teacher\'s reports through the API', async ({ request }) => {
    const carley = await loginToken(request, ACCOUNTS.teacher)
    const sammie = await loginToken(request, ACCOUNTS.sammie)
    const mine = await (await request.get(`${API_URL}/api/v1/teacher/reports`, { headers: authHeaders(carley) })).json()
    const target = mine.reports.find((r) => r.status !== 'published')
    test.skip(!target, 'no unpublished report to probe')

    const theirs = await (await request.get(`${API_URL}/api/v1/teacher/reports`, { headers: authHeaders(sammie) })).json()
    expect(theirs.reports.map((r) => r.id)).not.toContain(target.id)

    const publish = await request.post(`${API_URL}/api/v1/teacher/students/${target.studentId}/reports/${target.id}/publish`, { headers: authHeaders(sammie) })
    expect(publish.status()).toBe(404)
  })
})
