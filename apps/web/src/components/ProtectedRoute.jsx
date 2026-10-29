import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.roles?.[0])) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
