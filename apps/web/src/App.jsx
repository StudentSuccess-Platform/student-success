import { useState } from 'react'

import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import CheckEmail from './pages/auth/CheckEmail'
import CreateAccount from './pages/auth/CreateAccount'

function App() {
  const [authView, setAuthView] = useState('login')
  const [resetEmail, setResetEmail] = useState('')

  const handleResetRequested = (email) => {
    setResetEmail(email)
    setAuthView('check-email')
  }

  return (
    <>
      {authView === 'login' && (
        <Login
          onForgotPassword={() => setAuthView('forgot-password')}
          onCreateAccount={() => setAuthView('create-account')}
        />
      )}

      {authView === 'forgot-password' && (
        <ForgotPassword
          onBackToLogin={() => setAuthView('login')}
          onResetRequested={handleResetRequested}
        />
      )}

      {authView === 'check-email' && (
        <CheckEmail
          email={resetEmail}
          onBackToLogin={() => setAuthView('login')}
        />
      )}

      {authView === 'create-account' && (
        <CreateAccount
          onBackToLogin={() => setAuthView('login')}
        />
      )}
    </>
  )
}

export default App