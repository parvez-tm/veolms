import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CourseCard, CourseCardSkeleton } from '@/features/courses/CourseCard'
import { CategoryChip } from '@/features/courses/CategoryChip'
import { Select } from '@/components/ui/select'
import { useCatalog, useCategories } from '@/features/courses/api'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
]

export function CoursesPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const categoryId = params.get('category') ? Number(params.get('category')) : undefined
  const instructorId = params.get('instructor') ? Number(params.get('instructor')) : undefined
  const sort = params.get('sort') ?? 'newest'
  const [input, setInput] = useState(q)

  const { data: categories } = useCategories()
  const { data: courses, isLoading, isError } = useCatalog({
    q: q || undefined,
    categoryId,
    instructorId,
    sort,
    limit: 48,
  })

  const activeCategory = (categories ?? []).find((c) => c.id === categoryId)
  // When scoped to an instructor, name them from the first result (each catalog
  // course carries its instructor).
  const ins = courses?.[0]?.instructor
  const instructorName = ins
    ? `${ins.firstName ?? ''} ${ins.lastName ?? ''}`.trim() || ins.userName
    : undefined

  // Merge a single param into the URL (clearing it when empty).
  const patch = (key: string, value?: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    patch('q', input.trim() || undefined)
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#ffb59c] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute left-1/4 top-40 -z-10 h-64 w-64 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Catalog</span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {q || activeCategory || instructorId ? 'Courses' : (
                <>
                  Browse the{' '}
                  <span className="relative whitespace-nowrap text-primary">
                    full catalog
                    <svg aria-hidden viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full">
                      <path d="M2 8 C 50 2, 150 2, 198 8" stroke="#FFB020" strokeWidth="4" fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                </>
              )}
            </h1>
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              {q ? (
                <>Results for <span className="font-bold text-primary-strong">“{q}”</span></>
              ) : instructorId ? (
                <>Courses by <span className="font-bold text-primary-strong">{instructorName ?? 'this instructor'}</span></>
              ) : activeCategory ? (
                <>Showing <span className="font-bold text-primary-strong">{activeCategory.name}</span></>
              ) : (
                'Bite-sized, project-based courses. Stream lessons, track progress, and actually finish.'
              )}
            </p>
            {instructorId && (
              <button
                type="button"
                onClick={() => patch('instructor', undefined)}
                className="mt-3 text-sm font-bold text-primary-strong hover:underline"
              >
                View all courses
              </button>
            )}
          </div>

          <form onSubmit={onSearch} className="pop flex w-full max-w-md items-center gap-2 rounded-full p-1.5 pl-4">
            <Search className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search courses, topics, instructors…"
              className="flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm">Search</Button>
          </form>
        </div>

        {/* Filters: category chips + sort */}
        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <CategoryChip label="All" active={!categoryId} onClick={() => patch('category', undefined)} />
            {(categories ?? []).map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                count={Number(c.courseCount)}
                active={categoryId === c.id}
                onClick={() => patch('category', String(c.id))}
              />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-muted-foreground">
            <span>Sort</span>
            <div className="w-48">
              <Select
                value={sort}
                onChange={(v) => patch('sort', v === 'newest' ? undefined : v)}
                options={SORTS}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading && Array.from({ length: 8 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          {!isLoading && (courses ?? []).map((course) => <CourseCard key={course.id} course={course} />)}
        </div>

        {isError && (
          <div className="pop mx-auto mt-12 max-w-md p-8 text-center">
            <p className="font-semibold text-destructive">Couldn’t load courses. Please try again.</p>
          </div>
        )}
        {!isLoading && !isError && (courses ?? []).length === 0 && (
          <div className="pop mx-auto mt-12 max-w-md bg-tint p-8 text-center">
            <p className="font-semibold text-foreground">No courses found.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
