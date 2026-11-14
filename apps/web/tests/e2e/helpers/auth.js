// Shared helpers for the browser tests (not a test file).

// Accounts created by the seed script (apps/api seed, `npm run db:reset`). Every seeded user has
// the same password. The seed is deterministic, so these emails are stable.
export const PASSWORD = 'Password123!'

export const ACCOUNTS = {
  teacher: { email: 'carley.beer.2@example.test', name: 'Carley Beer', home: '/teacher/dashboard' },
  student: { email: 'judson.greenfelder.6@example.test', name: 'Judson Greenfelder', home: '/student/dashboard' },
  parent: { email: 'lorena.schneider.30@example.test', name: 'Lorena Schneider', home: '/parent' },
}

export async function signIn(page, account, password = PASSWORD) {
  await page.goto('/')
  await page.locator('#login-email').fill(account.email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export async function signOut(page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
}
