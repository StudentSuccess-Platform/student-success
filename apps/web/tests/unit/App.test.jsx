import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

describe('App', () => {
  it('renders the login view by default', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /welcome back/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('navigates to the forgot password view and back to login', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /forgot password\?/i })
    )

    expect(
      screen.getByRole('heading', { name: /forgot your password\?/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to login/i }))

    expect(
      screen.getByRole('heading', { name: /welcome back/i })
    ).toBeInTheDocument()
  })

  it('navigates to the create account view', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      screen.getByRole('heading', { name: /create your account/i })
    ).toBeInTheDocument()
  })

  it('requests a password reset and lands on check email, with resend and back to login working', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /forgot password\?/i })
    )
    await user.type(
      screen.getByLabelText(/email address/i),
      'teacher@university.edu'
    )
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(
      screen.getByRole('heading', { name: /check your email/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /resend email/i }))

    expect(
      screen.getByRole('status')
    ).toHaveTextContent(/resent the reset instructions/i)

    await user.click(screen.getByRole('button', { name: /back to login/i }))

    expect(
      screen.getByRole('heading', { name: /welcome back/i })
    ).toBeInTheDocument()
  })
})
