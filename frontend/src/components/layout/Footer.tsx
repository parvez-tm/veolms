import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-border bg-tint">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-extrabold">
          <span className="flex h-8 w-8 -rotate-6 items-center justify-center rounded-lg bg-primary font-grotesk text-sm text-primary-foreground">
            V
          </span>
          VeoLMS
        </Link>
        <p className="text-sm font-medium text-muted-foreground">
          © {new Date().getFullYear()} VeoLMS. Learn anything, build everything.
        </p>
        <nav className="flex gap-5 text-sm font-medium text-muted-foreground">
          <Link to="/courses" className="hover:text-foreground">
            Courses
          </Link>
          <Link to="/teach" className="hover:text-foreground">
            Teach
          </Link>
          <Link to="/login" className="hover:text-foreground">
            Log in
          </Link>
        </nav>
      </div>
    </footer>
  )
}
