import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { RoleName } from '@/types'

/**
 * Gate a route subtree. Unauthenticated users are sent to /login (with a return
 * path); authenticated users lacking an allowed role get /forbidden.
 *
 * NOTE: this is UX gating only. The backend independently authorizes every
 * request, so a tampered client cannot gain access by bypassing this.
 */
export function ProtectedRoute({ roles }: { roles?: RoleName[] }) {
  const { isAuthenticated, initializing, role } = useAuth()
  const location = useLocation()

  // Don't redirect before the initial cookie-based session check resolves, or a
  // returning user would be bounced to /login on every hard refresh.
  if (initializing) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm font-medium text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/forbidden" replace />
  }
  return <Outlet />
}
