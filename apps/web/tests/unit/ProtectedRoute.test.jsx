import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../src/components/ProtectedRoute'
import { AuthProvider } from '../../src/state/AuthContext'
import * as authApi from '../../src/services/authApi'

vi.mock('../../src/services/authApi')

function TestApp({ mockUser }) {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={mockUser ? mockUser.roles : undefined}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-only"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <div>Teacher Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-only"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div>Student Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
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

describe('ProtectedRoute', () => {
  it('redirects to / when user is not signed in', async () => {
    authApi.getMe.mockRejectedValue(new Error('Unauthorized'))

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders the protected content when user is signed in', async () => {
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

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('redirects to / when user does not have the allowed role', async () => {
    localStorage.setItem('authToken', 'test-token')

    authApi.getMe.mockResolvedValue({
      user: {
        id: '1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['student'],
      },
    })

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/teacher-only']}>
          <Routes>
            <Route path="/" element={<div>Login Page</div>} />
            <Route
              path="/teacher-only"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <div>Teacher Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    expect(screen.queryByText('Teacher Content')).not.toBeInTheDocument()
  })

  it('renders the protected content when user has the allowed role', async () => {
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
        <MemoryRouter initialEntries={['/teacher-only']}>
          <Routes>
            <Route path="/" element={<div>Login Page</div>} />
            <Route
              path="/teacher-only"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <div>Teacher Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Teacher Content')).toBeInTheDocument()
    })

    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
