import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Video,
  Users,
  IndianRupee,
  ArrowRight,
  LayoutDashboard,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'

const PERKS = [
  { icon: Video, title: 'Publish video courses', desc: 'Upload lessons or embed YouTube and organize them into sections.', tint: 'bg-primary' },
  { icon: Users, title: 'Reach learners', desc: 'Your published courses appear in the public catalog instantly.', tint: 'bg-teal' },
  { icon: IndianRupee, title: 'Earn from sales', desc: 'Set a price (or go free). Razorpay checkout handles payments.', tint: 'bg-amber' },
]

export function TeachPage() {
  const { isAuthenticated, role, becomeInstructor } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isAuthor = role === 'Instructor' || role === 'Admin'

  const onBecome = async () => {
    setError('')
    setLoading(true)
    try {
      await becomeInstructor()
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not upgrade your account'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative isolate overflow-hidden bg-tint">
      <div
        className="pointer-events-none absolute right-[-60px] top-[-80px] -z-10 h-[340px] w-[340px] rounded-full bg-[#FFD9C9] opacity-60 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-60px] left-[30%] -z-10 h-[260px] w-[260px] rounded-full bg-[#CFF4EC] opacity-60 blur-3xl"
        aria-hidden
      />
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <span className="eyebrow">Teach on VeoLMS</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Share what you know.{' '}
          <span className="relative whitespace-nowrap text-primary">
            Become an instructor.
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M2 8 C 50 2, 150 2, 198 8"
                stroke="#FFB020"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-muted-foreground">
          Create courses, upload video lessons, and reach learners, all from your
          own instructor dashboard.
        </p>

        {/* Action depends on auth state */}
        <div className="mt-8 flex flex-col items-center gap-3">
          {!isAuthenticated && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Sign up to start teaching
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          )}

          {isAuthenticated && !isAuthor && (
            <>
              <Button size="lg" onClick={onBecome} disabled={loading}>
                {loading ? 'Upgrading…' : 'Become an instructor'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
              <p className="text-sm font-medium text-muted-foreground">
                Free and instant. You’ll get an instructor dashboard right away.
              </p>
              {error && (
                <p className="pop bg-secondary px-4 py-2 text-sm font-semibold text-destructive">
                  {error}
                </p>
              )}
            </>
          )}

          {isAuthenticated && isAuthor && (
            <div className="flex flex-col items-center gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-teal/15 px-3.5 py-1.5 text-sm font-semibold text-teal">
                <CheckCircle2 className="h-4 w-4" />
                You can already create courses.
              </p>
              <Button size="lg" asChild>
                <Link to="/admin">
                  <LayoutDashboard className="h-4 w-4" />
                  Go to your dashboard
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Perks */}
        <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, desc, tint }) => (
            <div key={title} className="pop pop-hover p-6">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${tint}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
