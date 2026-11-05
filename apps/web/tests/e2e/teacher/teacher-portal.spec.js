import { test, expect } from '@playwright/test'
import { ACCOUNTS, signIn } from '../helpers/auth.js'

// Carley Beer teaches two seeded classes (Algebra I and Geometry) with 24 students between them.
test.describe('teacher portal', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.teacher)
    await expect(page).toHaveURL(/\/teacher\/dashboard$/)
  })

  test('the dashboard shows live numbers from the API', async ({ page }) => {
    const stats = page.locator('.stat-card-grid')
    await expect(stats).toContainText('Total Classes')
    await expect(stats).toContainText('Total Students')
    await expect(stats).toContainText('Need Intervention')
    await expect(stats).toContainText('Avg. Attendance')

    await expect(page.getByRole('heading', { name: 'Academic Performance Trends' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Attendance Overview' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Students Needing Intervention' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recent Activity & Pending Actions' })).toBeVisible()

    // Values come from the database, not the old mock data (which had a different class list).
    await expect(stats.getByText('24', { exact: true })).toBeVisible()
    await expect(page.getByText('Algebra I').first()).toBeVisible()
    await expect(page.getByText(/Loading dashboard/)).toHaveCount(0)
    await expect(page.getByText(/Couldn.t load dashboard/)).toHaveCount(0)
  })

  test('My Classes lists the teacher\'s own classes and opens one', async ({ page }) => {
    await page.getByRole('link', { name: 'My Classes' }).click()
    await expect(page).toHaveURL(/\/teacher\/classes$/)
    await expect(page.getByRole('heading', { name: 'My Classes' })).toBeVisible()

    await expect(page.getByText('Algebra I')).toBeVisible()
    await expect(page.getByText('Geometry')).toBeVisible()
    await expect(page.getByText('Room 101')).toBeVisible()
    await expect(page.getByRole('link', { name: /view class/i })).toHaveCount(2)

    await page.getByRole('link', { name: /view class/i }).first().click()
    await expect(page).toHaveURL(/\/teacher\/classes\/[0-9a-f]{24}$/)
    await expect(page.getByRole('heading', { name: 'Algebra I' })).toBeVisible()
  })

  test('the other sidebar pages are reachable placeholders', async ({ page }) => {
    for (const name of ['Students', 'Reports', 'Settings']) {
      await page.getByRole('link', { name }).click()
      await expect(page.getByRole('heading', { name })).toBeVisible()
    }
  })
})
