import { test, expect } from '@playwright/test'
import { ACCOUNTS, PASSWORD } from '../helpers/auth.js'

async function openCreateAccount(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
}

async function fillForm(page, { first, last, email, password, confirm = password }) {
  await page.locator('#create-first-name').fill(first)
  await page.locator('#create-last-name').fill(last)
  await page.locator('#create-email').fill(email)
  await page.locator('#create-password').fill(password)
  await page.locator('#confirm-password').fill(confirm)
}

test.describe('create account', () => {
  test('rejects mismatched passwords before calling the API', async ({ page }) => {
    await openCreateAccount(page)
    await fillForm(page, { first: 'Ada', last: 'Test', email: 'ada.test@example.test', password: PASSWORD, confirm: 'Different123!' })
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('alert')).toContainText('Passwords do not match')
  })

  test('rejects a password shorter than 8 characters', async ({ page }) => {
    await openCreateAccount(page)
    await fillForm(page, { first: 'Ada', last: 'Test', email: 'ada.test@example.test', password: 'short' })
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('alert')).toContainText('at least 8')
  })

  test('shows the server error when the email is already registered', async ({ page }) => {
    await openCreateAccount(page)
    await fillForm(page, { first: 'Carley', last: 'Beer', email: ACCOUNTS.teacher.email, password: PASSWORD })
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('alert')).toContainText('already registered')
  })

  test('a new parent registers and lands in the parent portal, signed in', async ({ page }) => {
    // Unique per run so repeated runs do not collide. The account stays in the dev database.
    const email = `e2e.parent.${Date.now()}@example.test`

    await openCreateAccount(page)
    await page.getByRole('radio', { name: /parent/i }).click()
    await fillForm(page, { first: 'Eve', last: 'Parent', email, password: PASSWORD })
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/parent$/)
    await page.reload()
    await expect(page).toHaveURL(/\/parent$/)
  })
})
