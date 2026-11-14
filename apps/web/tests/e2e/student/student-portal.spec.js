
import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'

test.describe('Student Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.student)
    await expect(page).toHaveURL(/\/student\/dashboard$/)
  })

  test('loads the student dashboard', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /good morning, judson/i })
    ).toBeVisible()

    await expect(page.getByText('72%', { exact: true })).toBeVisible()
    await expect(page.getByText('96%', { exact: true })).toBeVisible()
    await expect(page.getByText('Algebra I')).toBeVisible()
  })

  test('navigates to My Progress', async ({ page }) => {
    await page.getByRole('link', { name: 'My Progress' }).click()

    await expect(page).toHaveURL(/\/student\/progress$/)

    await expect(
      page.getByRole('heading', { name: /my progress/i })
    ).toBeVisible()
  })

  test('navigates to the Support Plan', async ({ page }) => {
    await page.getByRole('link', { name: 'Support Plan' }).click()

    await expect(page).toHaveURL(/\/student\/support-plan$/)

    await expect(
      page.getByText(/don't currently have an approved support plan/i)
    ).toBeVisible()
  })

  test('redirects the student root to the dashboard', async ({ page }) => {
    await page.goto('/student')

    await expect(page).toHaveURL(/\/student\/dashboard$/)
  })

  test('does not provide academic record editing controls', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /edit grade|save grade|delete grade/i })
    ).toHaveCount(0)
  })
})
