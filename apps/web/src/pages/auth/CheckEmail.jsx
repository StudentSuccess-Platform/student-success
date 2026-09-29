import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/auth.css'
import bookOpenIcon from '../../assets/icons/book-open.svg'
import shieldCheckIcon from '../../assets/icons/shield-check.svg'
import mailCheckIcon from '../../assets/icons/mail-check.svg'

function CheckEmail() {
  const [resendStatus, setResendStatus] = useState('')

  const handleResend = () => {
    console.log('Password reset email resend requested')
    setResendStatus("We've resent the reset instructions to your email.")
  }

  return (
    <main className="auth-page">
      <section className="auth-welcome">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <img src={bookOpenIcon} alt="" />
          </span>
          <p className="auth-brand-name">
            Student<span>Success</span>
          </p>
        </div>

        <div className="auth-welcome-copy">
          <div className="auth-eyebrow">
            <span className="auth-eyebrow-line" />
            <span>Academic intelligence</span>
          </div>
          <h1>Every student deserves a clear path forward.</h1>
          <p>
            Turn academic progress into timely insight, meaningful support, and
            stronger outcomes for every learner.
          </p>
          <div className="auth-highlights">
            <div className="auth-highlight">
              <strong>Real-time</strong>
              <span>Performance insights</span>
            </div>
            <div className="auth-highlight-divider" />
            <div className="auth-highlight">
              <strong>One place</strong>
              <span>Connected community</span>
            </div>
          </div>
        </div>

        <div className="auth-institution-note">
          <img src={shieldCheckIcon} alt="" />
          <span>Secure access for your academic community</span>
        </div>
      </section>

      <section className="auth-login-area">
        <div className="auth-card">
          <div className="auth-fp-header">
            <span className="auth-fp-icon">
              <img src={mailCheckIcon} alt="" />
            </span>
            <div className="auth-fp-header-text">
              <h2>Check your email</h2>
              <p>We sent password reset instructions to your email address.</p>
            </div>
          </div>

          <div className="auth-ce-actions">
            <div className="auth-ce-resend-group">
              <p>Didn&rsquo;t receive the email?</p>
              <button
                type="button"
                className="auth-ce-resend-btn"
                onClick={handleResend}
              >
                Resend email
              </button>
            </div>

            <Link to="/login" className="auth-fp-back">
              ← Back to login
            </Link>
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
      </section>
    </main>
  )
}

export default CheckEmail
