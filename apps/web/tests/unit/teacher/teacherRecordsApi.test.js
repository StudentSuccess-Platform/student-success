import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addGoalUpdate,
  createFeedback,
  createGoal,
  saveAttendance,
  saveGrade,
  updateFeedback,
  updateGoal,
} from '../../../src/services/teacherRecordsApi'

function lastCall() {
  const [url, options] = globalThis.fetch.mock.calls.at(-1)
  return { url, options }
}

beforeEach(() => {
  localStorage.setItem('authToken', 'tok-123')
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
  )
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('teacherRecordsApi', () => {
  it('saveGrade PUTs the grade payload to the student grades path with the token', async () => {
    await saveGrade('stu-1', { assignmentId: 'a1', pointsEarned: 18, status: 'graded' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/grades$/)
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ assignmentId: 'a1', pointsEarned: 18, status: 'graded' })
    expect(options.headers.Authorization).toBe('Bearer tok-123')
  })

  it('saveAttendance POSTs to the attendance path', async () => {
    await saveAttendance('stu-1', { sectionId: 'sec-1', date: '2025-11-14', status: 'tardy' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/attendance$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ sectionId: 'sec-1', date: '2025-11-14', status: 'tardy' })
  })

  it('createGoal POSTs to the goals path', async () => {
    await createGoal('stu-1', { title: 'Read more' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/goals$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ title: 'Read more' })
  })

  it('updateGoal PUTs to the single goal path', async () => {
    await updateGoal('stu-1', 'g1', { status: 'achieved' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/goals\/g1$/)
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ status: 'achieved' })
  })

  it('addGoalUpdate POSTs to the goal updates path', async () => {
    await addGoalUpdate('stu-1', 'g1', { progressPercent: 40, note: 'Halfway' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/goals\/g1\/updates$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ progressPercent: 40, note: 'Halfway' })
  })

  it('createFeedback POSTs to the feedback path', async () => {
    await createFeedback('stu-1', { sectionId: 'sec-1', body: 'Great work' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/feedback$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ sectionId: 'sec-1', body: 'Great work' })
  })

  it('updateFeedback PUTs to the single feedback path', async () => {
    await updateFeedback('stu-1', 'f9', { body: 'Revised' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/feedback\/f9$/)
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ body: 'Revised' })
  })

  it('sends no Authorization header when no token is stored', async () => {
    localStorage.removeItem('authToken')

    await createGoal('stu-1', { title: 'Read more' })

    expect(lastCall().options.headers.Authorization).toBeUndefined()
  })

  it('still sends the request when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    await createGoal('stu-1', { title: 'Read more' })

    expect(lastCall().options.headers.Authorization).toBeUndefined()
  })
})
