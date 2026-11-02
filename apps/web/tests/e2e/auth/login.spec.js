import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn, signOut } from '../helpers/auth.js'

test.describe('login', () => {
  test('shows the sign-in form to a signed-out visitor', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.locator('#login-email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('asks for email and password when the form is empty', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText('Please enter your email and password')
  })

  test('shows the server error for a wrong password and stays signed out', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacher, 'not-the-password')
    await expect(page.getByRole('alert')).toContainText('Invalid email or password')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('a teacher signs in, sees their name, stays signed in after reload, and signs out', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacher)
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText(ACCOUNTS.teacher.name)).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await signOut(page)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })
})
