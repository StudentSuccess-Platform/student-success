import { useState } from 'react'
import AuthLayout from '../../layouts/AuthLayout'
import '../../styles/auth.css'

import mailCheckIcon from '../../assets/icons/mail-check.svg'

function CheckEmail({ onBackToLogin }) {
  const [resendStatus, setResendStatus] = useState('')

  const handleResend = () => {
    console.log('Password reset email resend requested')

    setResendStatus(
      "We've resent the reset instructions to your email."
    )
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-fp-header">
          <span className="auth-fp-icon">
            <img src={mailCheckIcon} alt="" />
          </span>

          <div className="auth-fp-header-text">
            <h2>Check your email</h2>
            <p>
              We sent password reset instructions to your email address.
            </p>
          </div>
        </div>

        <div className="auth-ce-actions">
          <div className="auth-ce-resend-group">
            <p>Didn&apos;t receive the email?</p>

            <button
              type="button"
              className="auth-ce-resend-btn"
              onClick={handleResend}
            >
              Resend email
            </button>
          </div>

          <button
            type="button"
            className="auth-fp-back auth-text-link"
            onClick={onBackToLogin}
          >
            ← Back to login
          </button>
        </div>

        {resendStatus && (
          <p className="auth-fp-status" role="status">
            {resendStatus}
          </p>
        )}

        <div className="auth-ce-spacer" aria-hidden="true" />

        <p className="auth-footer">
          Need help accessing your account? <span>Contact support</span>
        </p>
      </div>
    </AuthLayout>
  )
}

export default CheckEmail