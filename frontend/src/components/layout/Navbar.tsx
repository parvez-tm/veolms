import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { isAuthenticated, isAdmin, role, user, logout } = useAuth()
  const navigate = useNavigate()
  const canManage = role === 'Admin' || role === 'Instructor'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors hover:text-foreground',
      isActive ? 'text-foreground' : 'text-muted-foreground'
    )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-extrabold">
          <span className="flex h-9 w-9 -rotate-6 items-center justify-center rounded-xl bg-primary font-grotesk text-primary-foreground">
            V
          </span>
          <span className="text-lg tracking-tight">VeoLMS</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/courses" className={linkClass}>
            Courses
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/my-learning" className={linkClass}>
              My Learning
            </NavLink>
          )}
          {!canManage && (
            <NavLink to="/teach" className={linkClass}>
              Teach
            </NavLink>
          )}
          {canManage && (
            <NavLink to="/admin" className={linkClass}>
              {isAdmin ? 'Admin' : 'Instructor'}
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex"
                >
                  <Link to="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user?.firstName ?? user?.userName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
