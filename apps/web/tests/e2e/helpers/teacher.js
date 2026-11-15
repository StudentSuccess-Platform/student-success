import { expect } from '@playwright/test'

// Teacher UI helpers (not a test file). Names are the accessible names the teacher pages expose.

// Opens a student's profile from the Students list, searching first so the link is always on screen.
export async function openStudentProfile(page, name) {
  await page.getByRole('link', { name: 'Students', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search students' }).fill(name)
  await page.getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}

// A page section (a <section> that contains the given heading). Scopes repeated labels such as "Class".
export function sectionWithHeading(page, heading) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
}

// A form group inside "Enter Academic Records" (each group has an h3 and role="group").
export function recordGroup(page, title) {
  return page.getByRole('group', { name: title, exact: true })
}
