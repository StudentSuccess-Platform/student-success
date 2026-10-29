import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './state/AuthContext'

import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import CheckEmail from './pages/auth/CheckEmail'
import CreateAccount from './pages/auth/CreateAccount'

import DashboardLayout from './layouts/DashboardLayout'
import ComingSoon from './components/common/ComingSoon'
import ProtectedRoute from './components/ProtectedRoute'
import TeacherDashboard from './pages/teacher/Dashboard'
import MyClasses from './pages/teacher/MyClasses'
import ClassDetail from './pages/teacher/ClassDetail'
import { teacherNavItems, studentNavItems } from './config/navConfig'
import avatarPlaceholder from './assets/images/avatar-placeholder.png'

import StudentDashboard from './pages/student/Dashboard'
import StudentProgress from './pages/student/Progress'
import StudentSupportPlan from './pages/student/SupportPlan'

const teacherUser = {
  name: 'Mrs. Sarah Jenkins',
  subtitle: 'Science Department',
  avatarUrl: avatarPlaceholder,
}

const studentUser = {
  name: 'Liam Patel',
  subtitle: 'Student',
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

function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <AuthFlow />
  }

  const role = user.roles?.[0]
  if (role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />
  } else if (role === 'student') {
    return <Navigate to="/student" replace />
  } else if (role === 'parent') {
    return <Navigate to="/parent" replace />
  }

  return <Navigate to="/" replace />
}

function TeacherPortal() {
  const { user } = useAuth()

  const userDisplay = {
    name: `${user.firstName} ${user.lastName}`,
    subtitle: 'Teacher',
    avatarUrl: avatarPlaceholder,
  }

  return (
    <DashboardLayout
      portalLabel="Teacher Portal"
      navItems={teacherNavItems}
      user={userDisplay}
    />
  )
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherPortal />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="classes" element={<MyClasses />} />
        <Route path="classes/:classId" element={<ClassDetail />} />
        <Route path="students" element={<ComingSoon title="Students" />} />
        <Route path="reports" element={<ComingSoon title="Reports" />} />
        <Route path="settings" element={<ComingSoon title="Settings" />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <ComingSoon title="Student Portal" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={['parent']}>
            <ComingSoon title="Parent Portal" />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App