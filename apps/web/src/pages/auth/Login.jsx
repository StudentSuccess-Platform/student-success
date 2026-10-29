import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import AuthLayout from '../../layouts/AuthLayout'
import '../../styles/auth.css'

import mailIcon from '../../assets/icons/mail.svg'
import lockKeyholeIcon from '../../assets/icons/lock-keyhole.svg'
import eyeIcon from '../../assets/icons/eye.svg'
import eyeOffIcon from '../../assets/icons/eye-off.svg'
import arrowRightIcon from '../../assets/icons/arrow-right.svg'

function Login({ onForgotPassword, onCreateAccount }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-heading">
          <h2>Welcome back</h2>
          <p>Academic Performance Monitoring System</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field-group">
            <label htmlFor="login-email">Email address</label>

            <div className="auth-input">
              <img src={mailIcon} alt="" />

              <input
                id="login-email"
                type="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="login-password">Password</label>

            <div className="auth-input">
              <img src={lockKeyholeIcon} alt="" />

              <input
                id="login-password"
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
                <img
                  src={showPassword ? eyeIcon : eyeOffIcon}
                  alt=""
                />
              </button>
            </div>
          </div>

          <div className="auth-options">
            <label className="auth-remember">
              <input type="checkbox" />
              Remember me
            </label>

            <button
              type="button"
              className="auth-text-link"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={isSubmitting}
          >
            Sign in
            <img src={arrowRightIcon} alt="" />
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            className="auth-text-link"
            onClick={onCreateAccount}
          >
            Create account
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}

export default Login