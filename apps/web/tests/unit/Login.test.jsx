import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Login from '../../src/pages/auth/Login'

function setup() {
  const onForgotPassword = vi.fn()
  const onCreateAccount = vi.fn()

  render(
    <Login
      onForgotPassword={onForgotPassword}
      onCreateAccount={onCreateAccount}
    />
  )

  return { onForgotPassword, onCreateAccount }
}

describe('Login', () => {
  it('shows a validation error when submitting an empty form', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/please enter your email and password/i)
  })

  it('clears the error once valid credentials are submitted', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.type(screen.getByLabelText(/^password$/i), 'hunter2')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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
