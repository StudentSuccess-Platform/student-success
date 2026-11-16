import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../../src/pages/auth/Login'
import { AuthProvider } from '../../../src/state/AuthContext'
import * as authApi from '../../../src/services/authApi'

vi.mock('../../../src/services/authApi')

function setup() {
  const onForgotPassword = vi.fn()
  const onCreateAccount = vi.fn()

  render(
    <AuthProvider>
      <MemoryRouter>
        <Login
          onForgotPassword={onForgotPassword}
          onCreateAccount={onCreateAccount}
        />
      </MemoryRouter>
    </AuthProvider>
  )

  return { onForgotPassword, onCreateAccount }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('Login', () => {
  it('shows a validation error when submitting an empty form', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/please enter your email and password/i)
  })

  it('calls the login API and stores the token on success', async () => {
    const user = userEvent.setup()
    setup()

    authApi.login.mockResolvedValue({
      token: 'test-token',
      user: {
        id: '1',
        email: 'teacher@university.edu',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['teacher'],
      },
    })

    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText(/^password$/i), 'hunter2')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'teacher@university.edu',
        password: 'hunter2',
      })
    })

    expect(localStorage.getItem('authToken')).toBe('test-token')
  })

  it('shows server error message on login failure', async () => {
    const user = userEvent.setup()
    setup()

    authApi.login.mockRejectedValue(
      new Error('Invalid email or password')
    )

    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText(/^password$/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('alert')
      ).toHaveTextContent(/invalid email or password/i)
    })
  })

  it('disables the submit button while submitting', async () => {
    const user = userEvent.setup()
    setup()

    authApi.login.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                token: 'test-token',
                user: { id: '1', email: 'test@test.com', firstName: 'John', lastName: 'Doe', roles: ['teacher'] },
              }),
            100
          )
        )
    )

    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText(/^password$/i), 'hunter2')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    setup()

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /hide password/i }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('calls onForgotPassword and onCreateAccount', async () => {
    const user = userEvent.setup()
    const { onForgotPassword, onCreateAccount } = setup()

    await user.click(screen.getByRole('button', { name: /forgot password\?/i }))
    expect(onForgotPassword).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(onCreateAccount).toHaveBeenCalledTimes(1)
  })
})
