import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

interface RequireAuthProps {
  allowedRoles?: string[]
  children?: React.ReactNode
}

export function RequireAuth({ allowedRoles, children }: RequireAuthProps) {
  const { isAuthenticated, roles } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role))) {
    return <Navigate to="/" replace />
  }

  return children ?? <Outlet />
}
