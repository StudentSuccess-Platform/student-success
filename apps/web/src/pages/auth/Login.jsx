import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/auth.css'
import bookOpenIcon from '../../assets/icons/book-open.svg'
import shieldCheckIcon from '../../assets/icons/shield-check.svg'
import mailIcon from '../../assets/icons/mail.svg'
import lockKeyholeIcon from '../../assets/icons/lock-keyhole.svg'
import eyeIcon from '../../assets/icons/eye.svg'
import eyeOffIcon from '../../assets/icons/eye-off.svg'
import arrowRightIcon from '../../assets/icons/arrow-right.svg'

function SchoolIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.33344 14V12C9.33344 11.6464 9.19295 11.3073 8.94288 11.0572C8.69282 10.8072 8.35365 10.6667 8 10.6667C7.64635 10.6667 7.30718 10.8072 7.05712 11.0572C6.80705 11.3073 6.66656 11.6464 6.66656 12V14M12.0003 3.33343V14M2.66624 4.00006L7.40395 1.47342C7.58903 1.38094 7.7931 1.3328 8 1.3328C8.2069 1.3328 8.41097 1.38094 8.59605 1.47342L13.3338 4.00006M3.99968 7.33339L1.65283 8.76472C1.55512 8.82419 1.47436 8.9078 1.41831 9.00751C1.36227 9.10722 1.33282 9.21967 1.3328 9.33404V12.6667C1.3328 13.0203 1.47329 13.3594 1.72336 13.6095C1.97342 13.8595 2.31259 14 2.66624 14H13.3338C13.6874 14 14.0266 13.8595 14.2766 13.6095C14.5267 13.3594 14.6672 13.0203 14.6672 12.6667V9.33338C14.6671 9.21911 14.6376 9.1068 14.5815 9.00722C14.5255 8.90764 14.4448 8.82413 14.3472 8.76472L12.0003 7.33339M3.99968 3.33343V14M9.33344 6.00007C9.33344 6.73645 8.73644 7.33339 8 7.33339C7.26356 7.33339 6.66656 6.73645 6.66656 6.00007C6.66656 5.2637 7.26356 4.66675 8 4.66675C8.73644 4.66675 9.33344 5.2637 9.33344 6.00007Z"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.666 6.66651V10.667M4.0002 8.33337V10.667C4.0002 11.1975 4.4216 11.7062 5.17168 12.0813C5.92177 12.4565 6.9391 12.6672 7.99988 12.6672C9.06066 12.6672 10.078 12.4565 10.8281 12.0813C11.5782 11.7062 11.9996 11.1975 11.9996 10.667V8.33337M14.2792 7.28149C14.3986 7.22883 14.4999 7.14232 14.5705 7.03266C14.6412 6.92301 14.6781 6.79503 14.6768 6.66458C14.6754 6.53413 14.6358 6.40694 14.5629 6.29877C14.49 6.19059 14.387 6.10619 14.2666 6.05602L8.55304 3.45305C8.37934 3.37381 8.19066 3.3328 7.99975 3.3328C7.80884 3.3328 7.62015 3.37381 7.44646 3.45305L1.73358 6.05335C1.6149 6.10534 1.51394 6.19079 1.44305 6.29925C1.37216 6.40772 1.3344 6.5345 1.3344 6.66409C1.3344 6.79367 1.37216 6.92045 1.44305 7.02892C1.51394 7.13738 1.6149 7.22283 1.73358 7.27482L7.44646 9.88045C7.62015 9.9597 7.80884 10.0007 7.99975 10.0007C8.19066 10.0007 8.37934 9.9597 8.55304 9.88045L14.2792 7.28149Z"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.6669 14V12.6667C10.6669 11.9594 10.3859 11.2811 9.88577 10.781C9.38563 10.281 8.7073 10 8 10H3.99968C3.29238 10 2.61405 10.281 2.11391 10.781C1.61377 11.2811 1.3328 11.9594 1.3328 12.6667V14M10.6669 2.08529C11.2388 2.23353 11.7452 2.56746 12.1068 3.03466C12.4683 3.50186 12.6645 4.07588 12.6645 4.66662C12.6645 5.25736 12.4683 5.83138 12.1068 6.29858C11.7452 6.76578 11.2388 7.09971 10.6669 7.24795M8.66672 4.66667C8.66672 6.13943 7.47272 7.33333 5.99984 7.33333C4.52696 7.33333 3.33296 6.13943 3.33296 4.66667C3.33296 3.19391 4.52696 2 5.99984 2C7.47272 2 8.66672 3.19391 8.66672 4.66667Z"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}

const ROLES = [
  { id: 'teacher', label: 'Teacher', Icon: SchoolIcon },
  { id: 'student', label: 'Student', Icon: GraduationCapIcon },
  { id: 'parent', label: 'Parent/Guardian', Icon: UsersIcon },
]

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [role, setRole] = useState('teacher')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }

    setError('')
    console.log('Login submitted:', { email, role })
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
          <div className="auth-heading">
            <h2>Welcome back</h2>
            <p>Academic Performance Monitoring System</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-role-selection">
              <span className="auth-field-label">Sign in as</span>
              <div className="auth-role-options" role="radiogroup" aria-label="Sign in as">
                {ROLES.map(({ id, label, Icon }) => {
                  const selected = role === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`auth-role-option${selected ? ' is-selected' : ''}`}
                      onClick={() => setRole(id)}
                    >
                      <span className="auth-role-icon">
                        <Icon />
                      </span>
                      <span className="auth-role-label">{label}</span>
                      <span className="auth-role-dot" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            </div>

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
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="password">Password</label>
              <div className="auth-input">
                <img src={lockKeyholeIcon} alt="" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <img src={showPassword ? eyeIcon : eyeOffIcon} alt="" />
                </button>
              </div>
            </div>

            <div className="auth-options">
              <label className="auth-remember">
                <input type="checkbox" />
                Remember me
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-submit">
              Login
              <img src={arrowRightIcon} alt="" />
            </button>
          </form>

          <p className="auth-footer">
            Need help accessing your account? <span>Contact support</span>
          </p>
        </div>
      </section>
    </main>
  )
}

export default Login
