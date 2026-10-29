import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../src/state/AuthContext'
import * as authApi from '../../src/services/authApi'

vi.mock('../../src/services/authApi')

function TestComponent() {
  const { user, token, loading, login, register, logout } = useAuth()

  return (
    <div>
      {loading && <p>Loading...</p>}
      {user && <p>User: {user.email}</p>}
      {token && <p>Token: {token}</p>}
      <button onClick={() => login({ email: 'test@test.com', password: 'pass' })}>
        Login
      </button>
      <button
        onClick={() =>
          register({
            email: 'test@test.com',
            password: 'pass',
            role: 'teacher',
            firstName: 'John',
            lastName: 'Doe',
          })
        }
      >
        Register
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('AuthContext', () => {
  it('provides user, token, and loading state', async () => {
    authApi.getMe.mockRejectedValue(new Error('No token'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Initially loading is true, but completes quickly when no token exists
    await waitFor(() => {
      // After loading completes, user should be null
      expect(screen.queryByText(/User:/)).not.toBeInTheDocument()
    })
  })

  it('stores token in localStorage after login', async () => {
    authApi.login.mockResolvedValue({
      token: 'test-token',
      user: {
        id: '1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['teacher'],
      },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const loginButton = screen.getByRole('button', { name: 'Login' })
    loginButton.click()

    await waitFor(() => {
      expect(screen.getByText(/Token: test-token/)).toBeInTheDocument()
    })

    expect(localStorage.getItem('authToken')).toBe('test-token')
  })

  it('stores user data after login', async () => {
    authApi.login.mockResolvedValue({
      token: 'test-token',
      user: {
        id: '1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['teacher'],
      },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const loginButton = screen.getByRole('button', { name: 'Login' })
    loginButton.click()

    await waitFor(() => {
      expect(screen.getByText(/User: test@test.com/)).toBeInTheDocument()
    })
  })

  it('clears token and user on logout', async () => {
    localStorage.setItem('authToken', 'test-token')

    authApi.getMe.mockResolvedValue({
      user: {
        id: '1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['teacher'],
      },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/User: test@test.com/)).toBeInTheDocument()
    })

    const logoutButton = screen.getByRole('button', { name: 'Logout' })
    logoutButton.click()

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBeNull()
    })

    expect(screen.queryByText(/User:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Token:/)).not.toBeInTheDocument()
  })

  it('restores session from localStorage on mount', async () => {
    localStorage.setItem('authToken', 'test-token')

    authApi.getMe.mockResolvedValue({
      user: {
        id: '1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['teacher'],
      },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/User: test@test.com/)).toBeInTheDocument()
    })

    expect(authApi.getMe).toHaveBeenCalledWith('test-token')
  })

  it('clears token on session restore failure', async () => {
    localStorage.setItem('authToken', 'invalid-token')

    authApi.getMe.mockRejectedValue(new Error('Unauthorized'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.queryByText(/User:/)).not.toBeInTheDocument()
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('stores token and user after register', async () => {
    authApi.register.mockResolvedValue({
      token: 'new-token',
      user: {
        id: '1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['teacher'],
      },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const registerButton = screen.getByRole('button', { name: 'Register' })
    registerButton.click()

    await waitFor(() => {
      expect(screen.getByText(/Token: new-token/)).toBeInTheDocument()
      expect(screen.getByText(/User: test@test.com/)).toBeInTheDocument()
    })

    expect(localStorage.getItem('authToken')).toBe('new-token')
  })
})
