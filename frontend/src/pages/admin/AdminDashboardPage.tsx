import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, FileEdit, Plus, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useManagedCourses } from '@/features/admin/api'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  tone: string
}) {
  return (
    <div className="pop pop-hover p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <span
          className={
            'flex h-11 w-11 items-center justify-center rounded-2xl text-white ' + tone
          }
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="font-grotesk mt-3 text-4xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

export function AdminDashboardPage() {
  const { isAdmin, user } = useAuth()
  const { data, isLoading } = useManagedCourses(isAdmin)
  const courses = data ?? []
  const published = courses.filter((c) => c.status === 'published').length
  const drafts = courses.length - published

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-10 -z-10 h-64 w-64 rounded-full bg-[#FFD9C9] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-[#CFF4EC] opacity-60 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back, {user?.firstName ?? user?.userName} 👋
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isAdmin
                ? 'Manage every course on the platform.'
                : 'Manage your courses and content.'}
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/courses/new">
              <Plus className="h-4 w-4" />
              New course
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total courses"
          value={isLoading ? '…' : courses.length}
          icon={BookOpen}
          tone="bg-primary"
        />
        <StatCard
          label="Published"
          value={isLoading ? '…' : published}
          icon={CheckCircle2}
          tone="bg-teal"
        />
        <StatCard
          label="Drafts"
          value={isLoading ? '…' : drafts}
          icon={FileEdit}
          tone="bg-amber"
        />
      </div>

      <div className="pop overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-foreground/10 px-5 py-4">
          <h2 className="text-lg font-bold tracking-tight">Recent courses</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/courses">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : courses.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-muted-foreground">No courses yet.</p>
            <Button asChild className="mt-4">
              <Link to="/admin/courses/new">
                <Plus className="h-4 w-4" />
                Create your first course
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-foreground/10">
            {courses.slice(0, 5).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-tint"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber text-white">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold tracking-tight">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-grotesk font-bold text-primary-strong">
                        {formatPrice(c.price, c.currency)}
                      </span>{' '}
                      · {c.level}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    'shrink-0 rounded-full px-3 py-1 text-xs font-bold ' +
                    (c.status === 'published'
                      ? 'bg-teal/15 text-teal'
                      : 'bg-muted text-muted-foreground')
                  }
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
