import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn, signOut } from '../helpers/auth.js'

test.describe('route guards', () => {
  test('a signed-out visitor is sent to the login page from every portal', async ({ page }) => {
    for (const path of ['/teacher/dashboard', '/teacher/classes', '/student', '/parent']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    }
  })

  test('each role lands in its own portal after signing in', async ({ page }) => {
    const accounts = [ACCOUNTS.teacher, ACCOUNTS.student, ACCOUNTS.parent]
    for (const [index, account] of accounts.entries()) {
      await signIn(page, account)
      await expect(page).toHaveURL(new RegExp(`${account.home.replaceAll('/', '\\/')}$`))
      if (index < accounts.length - 1) {
        await signOut(page)
        await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
      }
    }
  })

  test('a student cannot open the teacher portal', async ({ page }) => {
    await signIn(page, ACCOUNTS.student)
    await expect(page).toHaveURL(/\/student\/dashboard$/)

    await page.goto('/teacher/dashboard')
    await expect(page).not.toHaveURL(/\/teacher\//)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0)
  })

  test('a parent cannot open the student or teacher portals', async ({ page }) => {
    await signIn(page, ACCOUNTS.parent)
    await expect(page).toHaveURL(/\/parent\/overview$/)

    for (const path of ['/student', '/teacher/dashboard']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/parent\/overview$/)
    }
  })

  test('the API itself refuses another role\'s data, not just the UI', async ({ page, request }) => {
    await signIn(page, ACCOUNTS.student)
    await expect(page).toHaveURL(/\/student\/dashboard$/)
    const token = await page.evaluate(() => localStorage.getItem('authToken'))

    const api = process.env.E2E_API_URL ?? 'http://localhost:3000'
    const res = await request.get(`${api}/api/v1/teacher/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(403)
  })
})
