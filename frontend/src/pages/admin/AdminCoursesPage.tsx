import { Link } from 'react-router-dom'
import { Plus, Eye, Trash2, Globe, EyeOff, BookOpen, Settings } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  useManagedCourses,
  usePublishCourse,
  useDeleteCourse,
} from '@/features/admin/api'
import { Decor } from '@/components/layout/Decor'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

export function AdminCoursesPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading } = useManagedCourses(isAdmin)
  const publish = usePublishCourse()
  const remove = useDeleteCourse()
  const courses = data ?? []

  return (
    <div className="space-y-8">
      <div className="relative">
        <Decor className="rounded-[22px]">
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#ffb59c] opacity-70 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />
        </Decor>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your{' '}
              <span className="relative whitespace-nowrap text-primary">
                courses
                <svg
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 h-3 w-full"
                  aria-hidden="true"
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
            <p className="mt-3 font-medium text-muted-foreground">
              {isAdmin ? 'All courses on the platform.' : 'Courses you own.'}
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

      <div className="pop overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-10 text-sm font-medium text-muted-foreground">
            Loading…
          </p>
        ) : courses.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <BookOpen className="h-8 w-8 text-primary-strong" />
            </div>
            <p className="mt-4 font-semibold text-foreground">No courses yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first course to get started.
            </p>
            <Button asChild className="mt-5">
              <Link to="/admin/courses/new">
                <Plus className="h-4 w-4" />
                Create your first course
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {courses.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5"
              >
                <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-foreground bg-muted">
                  {c.thumbnail ? (
                    <img
                      src={c.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-amber text-white">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/courses/${c.id}`}
                    className="block truncate font-bold tracking-tight hover:text-primary"
                  >
                    {c.title}
                  </Link>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    <span className="font-grotesk font-bold text-primary-strong">
                      {formatPrice(c.price, c.currency)}
                    </span>{' '}
                    · {c.level}
                    {isAdmin && c.instructor
                      ? ` · ${c.instructor.firstName ?? c.instructor.userName ?? ''}`
                      : ''}
                  </p>
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

                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" asChild title="Manage">
                    <Link to={`/admin/courses/${c.id}`}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="View on site">
                    <Link to={`/courses/${c.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={c.status === 'published' ? 'Unpublish' : 'Publish'}
                    disabled={publish.isPending}
                    onClick={() =>
                      publish.mutate({
                        id: c.id,
                        publish: c.status !== 'published',
                      })
                    }
                  >
                    {c.status === 'published' ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4 text-teal" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${c.title}”? This removes its sections, lessons and enrollments.`
                        )
                      ) {
                        remove.mutate(c.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
