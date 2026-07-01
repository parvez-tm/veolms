import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const COLUMNS = [
  {
    title: 'Learn',
    links: [
      { to: '/courses', label: 'Courses' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/my-learning', label: 'My Learning' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/teach', label: 'Teach' },
    ],
  },
]

const ACCOUNT_COLUMN = {
  title: 'Account',
  links: [
    { to: '/login', label: 'Log in' },
    { to: '/signup', label: 'Sign up' },
  ],
}

export function Footer() {
  const { isAuthenticated } = useAuth()
  const columns = isAuthenticated ? COLUMNS : [...COLUMNS, ACCOUNT_COLUMN]
  return (
    <footer className="border-t-2 border-ink bg-tint">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="shrink-0">
            <Link to="/" className="flex items-center gap-2.5 font-extrabold">
              <span className="flex h-9 w-9 -rotate-6 items-center justify-center rounded-xl bg-primary font-grotesk text-primary-foreground">
                V
              </span>
              <span className="text-lg tracking-tight">VeoLMS</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm font-medium text-muted-foreground">
              Empower your learning journey.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10 sm:gap-16">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="font-grotesk text-sm font-bold uppercase tracking-wide text-foreground">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary-strong"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t-2 border-dashed border-border pt-6">
          <p className="text-sm font-medium text-muted-foreground">
            © {new Date().getFullYear()} VeoLMS. Empower your learning journey.
          </p>
        </div>
      </div>
    </footer>
  )
}
