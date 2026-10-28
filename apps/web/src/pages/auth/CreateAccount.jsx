import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import AuthLayout from '../../layouts/AuthLayout'
import RoleSelector from '../../components/auth/RoleSelector'
import '../../styles/auth.css'

import mailIcon from '../../assets/icons/mail.svg'
import lockKeyholeIcon from '../../assets/icons/lock-keyhole.svg'
import eyeIcon from '../../assets/icons/eye.svg'
import eyeOffIcon from '../../assets/icons/eye-off.svg'
import arrowRightIcon from '../../assets/icons/arrow-right.svg'

function CreateAccount({ onBackToLogin }) {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [role, setRole] = useState('teacher')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError('Please complete all required fields.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await register({
        email,
        password,
        role,
        firstName,
        lastName,
      })
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
          <h2>Create your account</h2>
          <p>Join the StudentSuccess academic community</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <RoleSelector
            role={role}
            onChange={setRole}
          />

          <div className="auth-field-group">
            <label htmlFor="create-first-name">First name</label>

            <div className="auth-input">
              <input
                id="create-first-name"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="create-last-name">Last name</label>

            <div className="auth-input">
              <input
                id="create-last-name"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="create-email">Email address</label>

            <div className="auth-input">
              <img src={mailIcon} alt="" />

              <input
                id="create-email"
                type="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="create-password">Password</label>

            <div className="auth-input">
              <img src={lockKeyholeIcon} alt="" />

              <input
                id="create-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
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

          <div className="auth-field-group">
            <label htmlFor="confirm-password">
              Confirm password
            </label>

            <div className="auth-input">
              <img src={lockKeyholeIcon} alt="" />

              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowConfirmPassword((value) => !value)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                <img
                  src={showConfirmPassword ? eyeIcon : eyeOffIcon}
                  alt=""
                />
              </button>
            </div>
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
            Create account
            <img src={arrowRightIcon} alt="" />
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <button
            type="button"
            className="auth-text-link"
            onClick={onBackToLogin}
          >
            Sign in
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}

export default CreateAccount