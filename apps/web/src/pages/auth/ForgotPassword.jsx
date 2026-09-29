import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../../styles/auth.css'
import bookOpenIcon from '../../assets/icons/book-open.svg'
import shieldCheckIcon from '../../assets/icons/shield-check.svg'
import mailIcon from '../../assets/icons/mail.svg'
import lockIcon from '../../assets/icons/lock.svg'
import arrowRightWhiteIcon from '../../assets/icons/arrow-right-white.svg'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setError('')
    console.log('Password reset requested:', { email })
    navigate('/check-email')
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
              <label htmlFor="email">Email address</label>
              <div className="auth-input">
                <img src={mailIcon} alt="" />
                <input
                  id="email"
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
              <p className="auth-error" id="email-error" role="alert">
                {error}
              </p>
            )}

            <div className="auth-fp-actions">
              <button type="submit" className="auth-submit auth-submit--accent">
                Send reset link
                <img src={arrowRightWhiteIcon} alt="" />
              </button>

              <Link to="/login" className="auth-fp-back">
                ← Back to login
              </Link>
            </div>
          </form>

          <p className="auth-footer">
            Need help accessing your account? <span>Contact support</span>
          </p>
        </div>
      </section>
    </main>
  )
}

export default ForgotPassword
