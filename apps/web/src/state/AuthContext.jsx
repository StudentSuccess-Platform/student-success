import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as authApi from '../services/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem('authToken')
        if (storedToken) {
          const userData = await authApi.getMe(storedToken)
          setToken(storedToken)
          setUser(userData.user)
        }
      } catch {
        // Clear token if restore fails
        try {
          localStorage.removeItem('authToken')
        } catch {
          // localStorage may be unavailable
        }
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const { token: newToken, user: userData } = await authApi.login({
      email,
      password,
    })

    try {
      localStorage.setItem('authToken', newToken)
    } catch {
      // localStorage may be unavailable
    }

    setToken(newToken)
    setUser(userData)
  }, [])

  const register = useCallback(
    async ({ email, password, role, firstName, lastName }) => {
      const { token: newToken, user: userData } = await authApi.register({
        email,
        password,
        role,
        firstName,
        lastName,
      })

      try {
        localStorage.setItem('authToken', newToken)
      } catch {
        // localStorage may be unavailable
      }

      setToken(newToken)
      setUser(userData)
    },
    []
  )

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem('authToken')
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
