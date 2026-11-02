import { useState } from 'react'
import { forgotPassword } from '../../services/authApi'
import AuthLayout from '../../layouts/AuthLayout'
import '../../styles/auth.css'

import mailIcon from '../../assets/icons/mail.svg'
import lockIcon from '../../assets/icons/lock.svg'
import arrowRightWhiteIcon from '../../assets/icons/arrow-right-white.svg'

function ForgotPassword({ onBackToLogin, onResetRequested }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      await forgotPassword(email.trim())
      onResetRequested(email)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-fp-header">
          <span className="auth-fp-icon">
            <img src={lockIcon} alt="" />
          </span>

          <div className="auth-fp-header-text">
            <h2>Forgot your password?</h2>

            <p>
              Enter the email address associated with your account and
              we&rsquo;ll send you instructions to reset your password.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field-group">
            <label htmlFor="forgot-email">Email address</label>

            <div className="auth-input">
              <img src={mailIcon} alt="" />

              <input
                id="forgot-email"
                type="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'email-error' : undefined}
              />
            </div>
          </div>

          {error && (
            <p
              className="auth-error"
              id="email-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="auth-fp-actions">
            <button
              type="submit"
              className="auth-submit auth-submit--accent"
              disabled={submitting}
            >
              Send reset link
              <img src={arrowRightWhiteIcon} alt="" />
            </button>

            <button
              type="button"
              className="auth-fp-back auth-text-link"
              onClick={onBackToLogin}
            >
              ← Back to login
            </button>
          </div>
        </form>

        <p className="auth-footer">
          Need help accessing your account? <span>Contact support</span>
        </p>
      </div>
    </AuthLayout>
  )
}

export default ForgotPassword