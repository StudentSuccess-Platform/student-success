import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../src/services/http'
import {
  approvePlan,
  createManualPlan,
  editPlan,
  generateAiPlan,
  listPlans,
  publishPlan,
  rejectPlan,
} from '../../../src/services/teacherRemediationApi'

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('teacherRemediationApi', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.setItem('authToken', 'tok-1')
    fetchMock = vi.fn(async () => jsonResponse({ plans: [] }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  function lastCall() {
    const [url, options] = fetchMock.mock.calls.at(-1)
    return { url, options }
  }

  it('lists plans with GET and the stored token', async () => {
    await listPlans('stu-1')

    const { url, options } = lastCall()
    expect(url).toMatch(/\/api\/v1\/teacher\/students\/stu-1\/remediation$/)
    expect(options.method).toBe('GET')
    expect(options.headers.Authorization).toBe('Bearer tok-1')
  })

  it('omits the Authorization header when no token is stored', async () => {
    localStorage.removeItem('authToken')

    await listPlans('stu-1')

    expect(lastCall().options.headers.Authorization).toBeUndefined()
  })

  it('posts the AI request with the section id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ plan: { id: 'p1' } }, 201))

    await generateAiPlan('stu-1', { sectionId: 'sec-1' })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/students\/stu-1\/remediation\/ai$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ sectionId: 'sec-1' })
  })

  it('posts a manual plan to the collection', async () => {
    await createManualPlan('stu-1', { sectionId: 'sec-1', title: 'Plan', items: [] })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/students\/stu-1\/remediation$/)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ sectionId: 'sec-1', title: 'Plan', items: [] })
  })

  it('puts edits to the plan path', async () => {
    await editPlan('stu-1', 'p-9', { title: 'New', items: [{ title: 'A' }] })

    const { url, options } = lastCall()
    expect(url).toMatch(/\/students\/stu-1\/remediation\/p-9$/)
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toEqual({ title: 'New', items: [{ title: 'A' }] })
  })

  it('posts approve, reject and publish to their own paths', async () => {
    await approvePlan('stu-1', 'p-9')
    expect(lastCall().url).toMatch(/\/remediation\/p-9\/approve$/)
    expect(lastCall().options.method).toBe('POST')

    await rejectPlan('stu-1', 'p-9', {})
    expect(lastCall().url).toMatch(/\/remediation\/p-9\/reject$/)
    expect(lastCall().options.method).toBe('POST')

    await publishPlan('stu-1', 'p-9')
    expect(lastCall().url).toMatch(/\/remediation\/p-9\/publish$/)
    expect(lastCall().options.method).toBe('POST')
  })

  it('throws an ApiError carrying the code and fallback from the server', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: 'The AI service is unavailable. You can create a plan manually.',
          code: 'AI_UNAVAILABLE',
          fallback: 'manual',
        },
        503
      )
    )

    const error = await generateAiPlan('stu-1', {}).catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(503)
    expect(error.code).toBe('AI_UNAVAILABLE')
    expect(error.fallback).toBe('manual')
    expect(error.message).toBe('The AI service is unavailable. You can create a plan manually.')
  })
})
