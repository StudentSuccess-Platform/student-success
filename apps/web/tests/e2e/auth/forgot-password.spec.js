import { test, expect } from '@playwright/test'
import { ACCOUNTS } from '../helpers/auth.js'

async function requestReset(page, email) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible()
  await page.locator('#forgot-email').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
}

test.describe('forgot password', () => {
  test('asks for an email address when the field is empty', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByRole('alert')).toContainText('Please enter your email address')
  })

  test('a registered email lands on the check-your-email screen and can go back to login', async ({ page }) => {
    await requestReset(page, ACCOUNTS.teacher.email)
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
    await page.getByRole('button', { name: /back to login/i }).click()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('an unknown email gets the same screen, so accounts cannot be discovered', async ({ page }) => {
    await requestReset(page, 'nobody.here@example.test')
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  })
})
