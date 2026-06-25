import { Users } from 'lucide-react'
import { useCourseStudents } from '@/features/admin/manage'

export function CourseStudents({ courseId }: { courseId: string | number }) {
  const { data, isLoading } = useCourseStudents(courseId)
  const students = data ?? []

  const name = (s: (typeof students)[number]) =>
    s.student
      ? `${s.student.firstName ?? ''} ${s.student.lastName ?? ''}`.trim() ||
        s.student.email
      : `User #${s.userId}`

  return (
    <div>
      <span className="eyebrow">People</span>
      <h2 className="mb-4 mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight">
        Enrolled students
        {!isLoading && (
          <span className="font-grotesk text-base font-bold text-muted-foreground">
            ({students.length})
          </span>
        )}
      </h2>

      <div className="pop overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-sm font-medium text-muted-foreground">Loading…</p>
        ) : students.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
              <Users className="h-7 w-7 text-primary-strong" />
            </div>
            <p className="mt-3 font-semibold">No students yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enrollments will appear here once people join.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-grotesk text-sm font-bold text-primary-strong">
                    {name(s).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{name(s)}</p>
                    {s.student?.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {s.student.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={
                      'rounded-full px-2.5 py-1 text-xs font-bold ' +
                      (s.status === 'completed'
                        ? 'bg-teal/15 text-teal'
                        : 'bg-secondary text-primary-strong')
                    }
                  >
                    {s.status}
                  </span>
                  <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
                    {new Date(s.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
