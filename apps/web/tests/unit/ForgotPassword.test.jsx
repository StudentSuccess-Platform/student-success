import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ForgotPassword from '../../src/pages/auth/ForgotPassword'

function setup() {
  const onBackToLogin = vi.fn()
  const onResetRequested = vi.fn()

  render(
    <ForgotPassword
      onBackToLogin={onBackToLogin}
      onResetRequested={onResetRequested}
    />
  )

  return { onBackToLogin, onResetRequested }
}

describe('ForgotPassword', () => {
  it('shows a validation error when the email is empty', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/please enter your email address/i)
  })

  it('requests a reset with the entered email', async () => {
    const user = userEvent.setup()
    const { onResetRequested } = setup()

    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(onResetRequested).toHaveBeenCalledWith('teacher@university.edu')
  })

  it('calls onBackToLogin when the back link is clicked', async () => {
    const user = userEvent.setup()
    const { onBackToLogin } = setup()

    await user.click(screen.getByRole('button', { name: /back to login/i }))

    expect(onBackToLogin).toHaveBeenCalledTimes(1)
  })
})
