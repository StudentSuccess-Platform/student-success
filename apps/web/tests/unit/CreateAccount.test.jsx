import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import CreateAccount from '../../src/pages/auth/CreateAccount'
import { AuthProvider } from '../../src/state/AuthContext'
import * as authApi from '../../src/services/authApi'

vi.mock('../../src/services/authApi')

function setup() {
  const onBackToLogin = vi.fn()

  render(
    <AuthProvider>
      <MemoryRouter>
        <CreateAccount onBackToLogin={onBackToLogin} />
      </MemoryRouter>
    </AuthProvider>
  )

  return { onBackToLogin }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

function getToggleButton(input) {
  return within(input.closest('.auth-input')).getByRole('button')
}

describe('CreateAccount', () => {
  it('defaults to the Teacher role and allows switching roles', async () => {
    const user = userEvent.setup()
    setup()

    const teacherOption = screen.getByRole('radio', { name: /teacher/i })
    const studentOption = screen.getByRole('radio', { name: /student/i })

    expect(teacherOption).toHaveAttribute('aria-checked', 'true')
    expect(studentOption).toHaveAttribute('aria-checked', 'false')

    await user.click(studentOption)

    expect(studentOption).toHaveAttribute('aria-checked', 'true')
    expect(teacherOption).toHaveAttribute('aria-checked', 'false')
  })

  it('shows a validation error when required fields are missing', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/please complete all required fields/i)
  })

  it('shows a validation error when password is less than 8 characters', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(
      screen.getByLabelText(/first name/i),
      'John'
    )
    await user.type(
      screen.getByLabelText(/last name/i),
      'Doe'
    )
    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.type(screen.getByLabelText(/confirm password/i), 'short')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/password must be at least 8 characters/i)
  })

  it('shows a validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(
      screen.getByLabelText(/first name/i),
      'John'
    )
    await user.type(
      screen.getByLabelText(/last name/i),
      'Doe'
    )
    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText('Password'), 'hunter2222')
    await user.type(screen.getByLabelText(/confirm password/i), 'hunter3333')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/passwords do not match/i)
  })

  it('calls the register API and stores the token on success', async () => {
    const user = userEvent.setup()
    setup()

    authApi.register.mockResolvedValue({
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
      screen.getByLabelText(/first name/i),
      'John'
    )
    await user.type(
      screen.getByLabelText(/last name/i),
      'Doe'
    )
    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText('Password'), 'hunter2222')
    await user.type(screen.getByLabelText(/confirm password/i), 'hunter2222')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'teacher@university.edu',
        password: 'hunter2222',
        role: 'teacher',
        firstName: 'John',
        lastName: 'Doe',
      })
    })

    expect(localStorage.getItem('authToken')).toBe('test-token')
  })

  it('shows server error message on register failure', async () => {
    const user = userEvent.setup()
    setup()

    authApi.register.mockRejectedValue(
      new Error('Email already exists')
    )

    await user.type(
      screen.getByLabelText(/first name/i),
      'John'
    )
    await user.type(
      screen.getByLabelText(/last name/i),
      'Doe'
    )
    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText('Password'), 'hunter2222')
    await user.type(screen.getByLabelText(/confirm password/i), 'hunter2222')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('alert')
      ).toHaveTextContent(/email already exists/i)
    })
  })

  it('toggles visibility for the password and confirm password fields independently', async () => {
    const user = userEvent.setup()
    setup()

    const passwordInput = screen.getByLabelText('Password')
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.click(getToggleButton(passwordInput))
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmInput).toHaveAttribute('type', 'password')

    await user.click(getToggleButton(confirmInput))
    expect(confirmInput).toHaveAttribute('type', 'text')
  })

  it('calls onBackToLogin when "Sign in" is clicked', async () => {
    const user = userEvent.setup()
    const { onBackToLogin } = setup()

    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(onBackToLogin).toHaveBeenCalledTimes(1)
  })
})
