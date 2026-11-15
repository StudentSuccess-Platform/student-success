import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'
import { BLAKE, seededStudentAccount, uniqueText } from '../helpers/api.js'
import { openStudentProfile } from '../helpers/teacher.js'

const cards = (page) => page.locator('article.remediation-card')
const cardWithTitle = (page, title) =>
  cards(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) })

// Latest AI or manual plan is listed first, so the first card is the one just created.
const newestCard = (page) => cards(page).first()

async function renameFirstCard(page, title) {
  const card = newestCard(page)
  await card.getByRole('button', { name: 'Edit', exact: true }).click()
  await card.getByLabel('Plan title').fill(title)
  await card.getByRole('button', { name: 'Save changes' }).click()
  await expect(cardWithTitle(page, title)).toHaveCount(1)
  return cardWithTitle(page, title)
}

// Reads the student's own Support Plan page as a fresh, signed-out browser context.
async function studentSupportPlanText(browser, account) {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await signIn(page, account)
    await expect(page).toHaveURL(/\/student\/dashboard$/)
    await page.goto('/student/support-plan')
    await expect(page.getByRole('heading', { name: 'Support Plan', exact: true })).toBeVisible()
    return await page.locator('main, body').first().innerText()
  } finally {
    await context.close()
  }
}

test.describe('teacher remediation plans', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.teacher)
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)
    await openStudentProfile(page, BLAKE.name)
    await expect(page.getByRole('button', { name: 'Generate AI recommendation' })).toBeVisible()
  })

  test('an AI plan is reviewed, edited, approved and published, then shown to the student', async ({ page, request, browser }) => {
    const student = await seededStudentAccount(request, BLAKE)
    await page.getByRole('button', { name: 'Generate AI recommendation' }).click()
    await expect(newestCard(page).getByText('Pending review')).toBeVisible()
    await expect(newestCard(page).getByText('AI draft (advisory, not yet approved)')).toBeVisible()

    const title = uniqueText('Support plan')
    const card = await renameFirstCard(page, title)
    await expect(card.getByText('Pending review')).toBeVisible()

    await card.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(card.getByText('Approved', { exact: true })).toBeVisible()

    await card.getByRole('button', { name: 'Publish', exact: true }).click()
    await expect(card.getByText('Published', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)

    const studentText = await studentSupportPlanText(browser, student)
    expect(studentText).toContain(title)
  })

  test('a rejected AI plan never reaches the student', async ({ page, request, browser }) => {
    const student = await seededStudentAccount(request, BLAKE)
    await page.getByRole('button', { name: 'Generate AI recommendation' }).click()
    await expect(newestCard(page).getByText('Pending review')).toBeVisible()

    const title = uniqueText('Rejected plan')
    const card = await renameFirstCard(page, title)
    await card.getByRole('button', { name: 'Reject', exact: true }).click()
    await expect(card.getByText('Rejected', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0)

    const studentText = await studentSupportPlanText(browser, student)
    expect(studentText).not.toContain(title)
  })

  test('a teacher can create a manual plan', async ({ page }) => {
    const title = uniqueText('Manual plan')
    await page.getByRole('button', { name: 'Create plan manually' }).click()
    await page.getByLabel('Plan title').fill(title)
    await page.getByLabel('Rationale').fill('Needs help with factoring.')
    await page.getByLabel('Steps (one per line)').fill('Review factoring worksheet\nAttend Tuesday tutoring')
    await page.getByRole('button', { name: 'Save plan' }).click()

    const card = cardWithTitle(page, title)
    await expect(card).toHaveCount(1)
    await expect(card.getByText('Draft', { exact: true })).toBeVisible()
    await expect(card).toContainText('Source: Teacher')
    await expect(card).toContainText('Review factoring worksheet')
    await expect(card).toContainText('Attend Tuesday tutoring')
  })

  test('when the AI is unavailable the teacher gets the message, the manual form, and keeps existing plans', async ({ page }) => {
    // Existing plan first, so the test can show it is still listed after the failure.
    const existing = uniqueText('Plan before outage')
    await page.getByRole('button', { name: 'Create plan manually' }).click()
    await page.getByLabel('Plan title').fill(existing)
    await page.getByRole('button', { name: 'Save plan' }).click()
    await expect(cardWithTitle(page, existing)).toHaveCount(1)

    await page.route('**/remediation/ai', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'The AI service is unavailable.',
          code: 'AI_UNAVAILABLE',
          fallback: 'manual',
        }),
      }),
    )

    await page.getByRole('button', { name: 'Generate AI recommendation' }).click()
    const alert = page.getByRole('alert').filter({ hasText: 'The AI service is unavailable.' })
    await expect(alert).toContainText('You can create a plan manually.')
    await expect(page.getByLabel('Plan title')).toBeVisible()
    await expect(cardWithTitle(page, existing)).toHaveCount(1)

    await page.unroute('**/remediation/ai')
    const manual = uniqueText('Plan after outage')
    await page.getByLabel('Plan title').fill(manual)
    await page.getByRole('button', { name: 'Save plan' }).click()
    await expect(cardWithTitle(page, manual)).toHaveCount(1)
    await expect(cardWithTitle(page, existing)).toHaveCount(1)
  })
})
