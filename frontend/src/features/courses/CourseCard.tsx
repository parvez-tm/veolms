import { Link } from 'react-router-dom'
import { BookOpen, PlayCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Course } from '@/types'

export function CourseCard({ course }: { course: Course }) {
  const instructor = course.instructor
    ? `${course.instructor.firstName ?? ''} ${course.instructor.lastName ?? ''}`.trim() ||
      course.instructor.userName ||
      'VeoLMS'
    : 'VeoLMS'

  const isFree = !course.price || course.price <= 0

  return (
    <Link to={`/courses/${course.id}`} className="group block">
      <article className="pop pop-hover flex h-full flex-col overflow-hidden">
        <div className="relative aspect-video w-full overflow-hidden">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-amber text-white">
              <BookOpen className="h-10 w-10" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <PlayCircle className="h-12 w-12 text-white drop-shadow" />
          </div>
          {course.category && (
            <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-foreground shadow-sm">
              {course.category.name}
            </span>
          )}
          {isFree && (
            <span className="absolute right-3 top-3 rounded-full bg-amber px-2.5 py-1 text-xs font-bold text-white">
              Free
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground">{instructor}</p>
          <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
            <span className="font-grotesk text-sm font-bold capitalize text-amber">
              {course.level}
            </span>
            <span className="font-grotesk text-base font-extrabold text-primary-strong">
              {formatPrice(course.price, course.currency)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className="pop flex flex-col overflow-hidden">
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
