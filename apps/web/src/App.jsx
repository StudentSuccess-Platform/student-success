import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import CheckEmail from './pages/auth/CheckEmail'
import CreateAccount from './pages/auth/CreateAccount'

import DashboardLayout from './layouts/DashboardLayout'
import ComingSoon from './components/common/ComingSoon'
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
          <Route path="classes" element={<MyClasses />} />
          <Route path="classes/:classId" element={<ClassDetail />} />
          <Route path="students" element={<ComingSoon title="Students" />} />
          <Route path="reports" element={<ComingSoon title="Reports" />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>

        {/* Student Portal */}
        <Route
          path="/student"
          element={
            <DashboardLayout
              portalLabel="Student Portal"
              navItems={studentNavItems}
              user={studentUser}
            />
          }
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          <Route
            path="dashboard"
            element={<StudentDashboard />}
          />

          <Route
            path="progress"
            element={<StudentProgress />}
          />

          <Route
            path="support-plan"
            element={<StudentSupportPlan />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App