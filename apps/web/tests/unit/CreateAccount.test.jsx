import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CreateAccount from '../../src/pages/auth/CreateAccount'

function setup() {
  const onBackToLogin = vi.fn()

  render(<CreateAccount onBackToLogin={onBackToLogin} />)

  return { onBackToLogin }
}

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

  it('shows a validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.type(screen.getByLabelText(/confirm password/i), 'hunter3')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/passwords do not match/i)
  })

  it('clears the error once a matching password is submitted', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.type(screen.getByLabelText(/confirm password/i), 'hunter2')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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
