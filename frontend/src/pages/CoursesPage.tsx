import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CourseCard, CourseCardSkeleton } from '@/features/courses/CourseCard'
import { useCatalog } from '@/features/courses/api'

export function CoursesPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const [input, setInput] = useState(search)
  const { data: courses, isLoading, isError } = useCatalog({
    search: search || undefined,
  })

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    setParams(input.trim() ? { search: input.trim() } : {})
  }

  return (
    <div className="relative overflow-hidden">
      {/* soft pastel blobs */}
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#ffb59c] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute left-1/4 top-40 -z-10 h-64 w-64 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Catalog</span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {search ? (
                'All courses'
              ) : (
                <>
                  Browse the{' '}
                  <span className="relative whitespace-nowrap text-primary">
                    full catalog
                    <svg
                      aria-hidden
                      viewBox="0 0 200 12"
                      preserveAspectRatio="none"
                      className="absolute -bottom-2 left-0 h-3 w-full"
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
                </>
              )}
            </h1>
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              {search ? (
                <>
                  Results for{' '}
                  <span className="font-bold text-primary-strong">“{search}”</span>
                </>
              ) : (
                'Bite-sized, project-based courses. Stream lessons, track progress, and actually finish.'
              )}
            </p>
          </div>

          <form
            onSubmit={onSearch}
            className="pop flex w-full max-w-md items-center gap-2 p-1.5 pl-4"
          >
            <Search className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What do you want to learn?"
              className="flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          {!isLoading &&
            (courses ?? []).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
        </div>

        {isError && (
          <div className="pop mx-auto mt-12 max-w-md p-8 text-center">
            <p className="font-semibold text-destructive">
              Couldn’t load courses. Please try again.
            </p>
          </div>
        )}
        {!isLoading && !isError && (courses ?? []).length === 0 && (
          <div className="pop mx-auto mt-12 max-w-md bg-tint p-8 text-center">
            <p className="font-semibold text-foreground">No courses found.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
