import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from '../../../src/services/http'

function mockFetch(status, body) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => (body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body)),
    })
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('request', () => {
  it('returns the parsed body and sends the bearer token and JSON body', async () => {
    mockFetch(200, { ok: true })

    const data = await request('/api/v1/x', { method: 'POST', body: { a: 1 }, token: 'tok' })

    expect(data).toEqual({ ok: true })
    const [url, options] = globalThis.fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/x$/)
    expect(options.method).toBe('POST')
    expect(options.body).toBe('{"a":1}')
    expect(options.headers.Authorization).toBe('Bearer tok')
  })

  it('throws an ApiError carrying status, fields, code and fallback from the server', async () => {
    mockFetch(400, {
      error: 'Please fix the highlighted fields',
      fields: { pointsEarned: 'Required' },
      code: 'AI_UNAVAILABLE',
      fallback: 'manual',
    })

    const error = await request('/api/v1/x').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Please fix the highlighted fields')
    expect(error.status).toBe(400)
    expect(error.fields).toEqual({ pointsEarned: 'Required' })
    expect(error.code).toBe('AI_UNAVAILABLE')
    expect(error.fallback).toBe('manual')
  })

  it('uses a friendly message when the error body is empty or not JSON', async () => {
    mockFetch(500, undefined)

    const error = await request('/api/v1/x').catch((e) => e)

    expect(error.status).toBe(500)
    expect(error.message).toBe('Something went wrong. Please try again.')
    expect(error.fields).toBeUndefined()
  })

  it('reports a network failure as status 0', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new TypeError('failed')))

    const error = await request('/api/v1/x').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/network error/i)
  })
})


describe('request with unusual error bodies', () => {
  it('throws ApiError with the fallback message when the error body is JSON null', async () => {
    mockFetch(500, null)

    const error = await request('/api/v1/x').catch((caught) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(500)
    expect(error.message).toBe('Something went wrong. Please try again.')
    expect(error.fields).toBeUndefined()
  })
})
