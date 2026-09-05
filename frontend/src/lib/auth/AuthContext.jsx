import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService } from '../api/services/authService'
import { setAccessToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  const bootstrap = useCallback(async () => {
    try {
      const data = await authService.refresh()
      setAccessToken(data.access_token)
      setUser(data.user)
    } catch {
      setAccessToken(null)
      setUser(null)
    } finally {
      setInitializing(false)
    }
  }, [])

  useEffect(() => {
    bootstrap()
    const onExpired = () => setUser(null)
    window.addEventListener('pp360:session-expired', onExpired)
    return () => window.removeEventListener('pp360:session-expired', onExpired)
  }, [bootstrap])

  const login = async (email, password) => {
    const data = await authService.login(email, password)
    setAccessToken(data.access_token)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }

  const hasPermission = (code) => !!user?.permissions?.includes(code)
  const hasAnyPermission = (codes) => codes.some((c) => hasPermission(c))
  const hasRole = (role) => !!user?.roles?.includes(role)

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout, hasPermission, hasAnyPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
