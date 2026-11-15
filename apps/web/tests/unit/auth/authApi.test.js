import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as authApi from '../../../src/services/authApi'

globalThis.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('authApi', () => {
  describe('login', () => {
    it('calls the login endpoint and returns the response', async () => {
      const mockResponse = {
        token: 'test-token',
        user: {
          id: '1',
          email: 'test@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['teacher'],
        },
      }

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await authApi.login({
        email: 'test@test.com',
        password: 'password123',
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/auth\/login$/),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('throws an error with the server message on 401', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid email or password' }),
      })

      await expect(
        authApi.login({
          email: 'test@test.com',
          password: 'wrong',
        })
      ).rejects.toThrow('Invalid email or password')
    })

    it('throws an error with fallback message on network error', async () => {
      globalThis.fetch.mockRejectedValue(new TypeError('Network error'))

      await expect(
        authApi.login({
          email: 'test@test.com',
          password: 'password123',
        })
      ).rejects.toThrow('Network error. Please check your connection.')
    })
  })

  describe('register', () => {
    it('calls the register endpoint and returns the response', async () => {
      const mockResponse = {
        token: 'test-token',
        user: {
          id: '1',
          email: 'test@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['teacher'],
        },
      }

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await authApi.register({
        email: 'test@test.com',
        password: 'password123',
        role: 'teacher',
        firstName: 'John',
        lastName: 'Doe',
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/auth\/register$/),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('throws an error with the server message on 409', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Email already exists' }),
      })

      await expect(
        authApi.register({
          email: 'test@test.com',
          password: 'password123',
          role: 'teacher',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow('Email already exists')
    })

    it('throws an error with fallback message on network error', async () => {
      globalThis.fetch.mockRejectedValue(new TypeError('Network error'))

      await expect(
        authApi.register({
          email: 'test@test.com',
          password: 'password123',
          role: 'teacher',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow('Network error. Please check your connection.')
    })
  })

  describe('getMe', () => {
    it('calls the getMe endpoint with the token and returns the response', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['teacher'],
        },
      }

      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await authApi.getMe('test-token')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/auth\/me$/),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('throws an error with the server message on 401', async () => {
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })

      await expect(authApi.getMe('invalid-token')).rejects.toThrow(
        'Unauthorized'
      )
    })

    it('throws an error with fallback message on network error', async () => {
      globalThis.fetch.mockRejectedValue(new TypeError('Network error'))

      await expect(authApi.getMe('test-token')).rejects.toThrow(
        'Network error. Please check your connection.'
      )
    })
  })
})
