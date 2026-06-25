import { Link } from 'react-router-dom'
import { PlayCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Course } from '@/types'

// Varied gradient covers so a thumbnail-less catalog stays colorful, not monotone.
const COVERS = [
  'from-[#ff5a3c] to-[#ffb020]',
  'from-[#13b6a4] to-[#7ce0cf]',
  'from-[#7c6bff] to-[#b3a7ff]',
  'from-[#ff7a45] to-[#ff5a3c]',
  'from-[#1fa2ff] to-[#13b6a4]',
  'from-[#ffb020] to-[#ff7a45]',
  'from-[#ff5a8a] to-[#ff5a3c]',
  'from-[#13b6a4] to-[#1fa2ff]',
]

function coverFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return COVERS[h % COVERS.length]
}

export function CourseCard({ course }: { course: Course }) {
  const instructor = course.instructor
    ? `${course.instructor.firstName ?? ''} ${course.instructor.lastName ?? ''}`.trim() ||
      course.instructor.userName ||
      'VeoLMS'
    : 'VeoLMS'

  const isFree = !course.price || course.price <= 0
  const cover = coverFor(String(course.id ?? course.title))
  const initial = course.title?.trim().charAt(0).toUpperCase() || 'V'

  return (
    <Link to={`/courses/${course.id}`} className="group block">
      <article className="pop pop-hover flex h-full flex-col overflow-hidden">
        <div className="relative aspect-video w-full overflow-hidden border-b-2 border-ink">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={
                'relative flex h-full w-full items-center justify-center bg-gradient-to-br ' +
                cover
              }
            >
              {/* dotted texture overlay */}
              <div
                className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.55)_1.5px,transparent_1.6px)] [background-size:18px_18px]"
                aria-hidden
              />
              <span className="font-grotesk text-6xl font-bold text-white/90 drop-shadow-sm">
                {initial}
              </span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-ink/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <PlayCircle className="h-12 w-12 text-white drop-shadow" />
          </div>
          {course.category && (
            <span className="tag absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-foreground">
              {course.category.name}
            </span>
          )}
          {isFree && (
            <span className="tag absolute right-3 top-3 rounded-full bg-amber px-2.5 py-1 text-xs font-bold text-ink">
              Free
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground">{instructor}</p>
          <div className="mt-auto flex items-center justify-between border-t-2 border-dashed border-border pt-3">
            <span className="font-grotesk text-sm font-bold capitalize text-teal">
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
      <div className="aspect-video w-full animate-pulse border-b-2 border-ink bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
