import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'

export function RequireAuth() {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        Loading PeoplePay360…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export function RequirePermission({ permission, children }) {
  const { hasAnyPermission } = useAuth()
  const codes = Array.isArray(permission) ? permission : [permission]
  if (!hasAnyPermission(codes)) {
    return (
      <div className="p-8 text-center text-muted">
        <p className="text-lg font-medium text-[#E5E5E5]">Access restricted</p>
        <p className="mt-2 text-sm">You do not have permission to view this page.</p>
      </div>
    )
  }
  return children
}
