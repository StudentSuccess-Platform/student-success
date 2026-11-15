import { PASSWORD } from './auth.js'

// Direct API calls for test setup and for checking what the server returns (not a test file).
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'

export async function loginToken(request, account, password = PASSWORD) {
  const res = await request.post(`${API_URL}/api/v1/auth/login`, {
    data: { email: account.email, password },
  })
  if (!res.ok()) throw new Error(`Login failed for ${account.email}: ${res.status()}`)
  return (await res.json()).token
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

// A title nobody else has used, so assertions survive a database that already holds earlier runs.
export function uniqueText(prefix) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

// Blake Rowe (seeded student, child of the seeded parent). Specs that change data use him, not
// Judson, because the student portal spec reads Judson's own numbers and support plan.
export const BLAKE = { id: '000000000000000000000047', name: 'Blake Rowe', firstName: 'Blake', lastName: 'Rowe' }

// The API does not return emails. The seed names logins `<first>.<last>.<n>@example.test`, where n is
// the user's position in the seed (admin 1, teachers 2-5, students 6-29), so try that range.
export async function seededStudentAccount(request, { firstName, lastName }) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
  for (let n = 6; n <= 29; n += 1) {
    const account = {
      email: `${base}.${n}@example.test`,
      name: `${firstName} ${lastName}`,
      home: '/student/dashboard',
    }
    const res = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: account.email, password: PASSWORD },
    })
    if (res.ok()) return account
  }
  throw new Error(`No seeded student login found for ${firstName} ${lastName}`)
}
