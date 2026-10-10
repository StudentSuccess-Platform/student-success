import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import CheckEmail from './pages/auth/CheckEmail'
import CreateAccount from './pages/auth/CreateAccount'

import DashboardLayout from './layouts/DashboardLayout'
import ComingSoon from './components/common/ComingSoon'
import TeacherDashboard from './pages/teacher/Dashboard'
import { teacherNavItems } from './config/navConfig'
import avatarPlaceholder from './assets/images/avatar-placeholder.png'

const teacherUser = {
  name: 'Mrs. Sarah Jenkins',
  subtitle: 'Science Department',
  avatarUrl: avatarPlaceholder,
}

function AuthFlow() {
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthFlow />} />

        <Route
          path="/teacher"
          element={
            <DashboardLayout
              portalLabel="Teacher Portal"
              navItems={teacherNavItems}
              user={teacherUser}
            />
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="classes" element={<ComingSoon title="My Classes" />} />
          <Route path="students" element={<ComingSoon title="Students" />} />
          <Route path="reports" element={<ComingSoon title="Reports" />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App