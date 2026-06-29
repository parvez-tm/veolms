import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Search,
  ShieldCheck,
  Zap,
  IndianRupee,
  Star,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CourseCard, CourseCardSkeleton } from '@/features/courses/CourseCard'
import { CategoryChip } from '@/features/courses/CategoryChip'
import { useCatalog, useCategories } from '@/features/courses/api'
import { useAuth } from '@/context/AuthContext'

const TESTIMONIALS = [
  {
    quote:
      'The project-based lessons finally made things click. I shipped my first full-stack app in a weekend.',
    name: 'Aarav Sharma',
    role: 'Frontend Developer',
  },
  {
    quote:
      'Clean player, resume-where-I-left-off, and no fluff. VeoLMS respects your time.',
    name: 'Priya Menon',
    role: 'CS Student',
  },
  {
    quote:
      'Pay once and own it forever sold me. The courses are genuinely well structured.',
    name: 'Daniel Okafor',
    role: 'Career switcher',
  },
]

const FAQS = [
  {
    q: 'Do I pay once or subscribe?',
    a: 'Most courses are a one-time purchase: pay once and keep lifetime access. We also publish free courses you can start with no card.',
  },
  {
    q: 'How is the video delivered?',
    a: 'Lessons stream as adaptive-bitrate HLS that adjusts to your connection, with resume, speed controls and quality selection built in.',
  },
  {
    q: 'Can I get a refund?',
    a: 'If a paid course isn’t what you expected, reach out within 7 days and we’ll sort it out.',
  },
  {
    q: 'Do I need an account to browse?',
    a: 'No. You can browse the full catalog and watch preview lessons without signing up. You only need an account to enroll.',
  },
]

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="pop overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold"
        aria-expanded={open}
      >
        {q}
        <ChevronDown className={'h-5 w-5 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && <p className="px-5 pb-5 font-medium text-muted-foreground">{a}</p>}
    </div>
  )
}

export function HomePage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { data: courses, isLoading } = useCatalog({ limit: 8 })
  const { data: popular } = useCatalog({ sort: 'popular', limit: 8 })
  const { data: categories } = useCategories()
  const { isAuthenticated, dashboardPath } = useAuth()

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    navigate(
      search.trim() ? `/courses?q=${encodeURIComponent(search.trim())}` : '/courses'
    )
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-dots relative isolate overflow-hidden border-b-2 border-ink bg-tint">
        {/* pastel blobs */}
        <div
          className="pointer-events-none absolute -right-16 -top-24 -z-10 h-[380px] w-[380px] rounded-full bg-[#ffb59c] opacity-70 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-[24%] -z-10 h-[320px] w-[320px] rounded-full bg-[#a7ecdd] opacity-70 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 top-1/3 -z-10 h-[260px] w-[260px] rounded-full bg-[#c8c0ff] opacity-50 blur-3xl"
          aria-hidden
        />

        <div className="mx-auto max-w-3xl px-4 pb-24 pt-14 text-center sm:px-6 lg:px-8 lg:pb-32 lg:pt-20">
          <span className="eyebrow inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber text-amber" />
            Hands-on developer courses
          </span>

          <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Learn to build, the{' '}
            <span className="relative inline-block whitespace-nowrap text-primary">
              fun way
              <svg
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                aria-hidden
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
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg font-medium text-muted-foreground sm:text-xl">
            Bite-sized, project-based video courses in web development and beyond.
            Stream lessons, track progress, and actually finish.
          </p>

          {/* pill search */}
          <form
            onSubmit={onSearch}
            className="pop mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-full p-2 pl-5"
          >
            <Search className="pointer-events-none h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="What do you want to learn today?"
              className="h-10 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
              aria-label="Search courses"
            />
            <Button type="submit" className="shrink-0">
              Search
            </Button>
          </form>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <Button size="lg" asChild>
                  <Link to={dashboardPath}>
                    Go to dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/courses">Explore courses</Link>
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/courses">
                    Explore courses
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/signup">Start free</Link>
                </Button>
              </>
            )}
          </div>

          {/* stat strip */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4">
            {[
              { k: 'Expert', v: 'Courses', c: 'text-primary-strong' },
              { k: 'HD video', v: 'Streaming', c: 'text-teal' },
              { k: 'Lifetime', v: 'Access', c: 'text-violet' },
            ].map((s) => (
              <div key={s.v} className="pop-soft rounded-2xl bg-card px-3 py-4">
                <p className={'font-grotesk text-xl font-bold sm:text-2xl ' + s.c}>
                  {s.k}
                </p>
                <p className="text-sm font-medium text-muted-foreground">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by category */}
      {(categories ?? []).length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <span className="eyebrow">Browse</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Explore by category
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            {(categories ?? []).map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                count={Number(c.courseCount)}
                to={`/courses?category=${c.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured (newest) courses */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-5">
          <div>
            <span className="eyebrow">Featured</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Fresh on VeoLMS
            </h2>
            <p className="mt-2 font-medium text-muted-foreground">
              The latest courses, hot off the press.
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link to="/courses">
              See all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <CourseCardSkeleton key={i} />)
            : (courses ?? [])
                .slice(0, 8)
                .map((course) => <CourseCard key={course.id} course={course} />)}
        </div>

        {!isLoading && (courses ?? []).length === 0 && (
          <div className="pop py-16 text-center font-medium text-muted-foreground">
            No courses published yet. Check back soon.
          </div>
        )}
      </section>

      {/* Most popular courses */}
      {(popular ?? []).length > 0 && (
        <section className="bg-tint2">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between gap-5">
              <div>
                <span className="eyebrow text-violet">Most popular</span>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  What learners love
                </h2>
                <p className="mt-2 font-medium text-muted-foreground">
                  The most-enrolled courses right now.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(popular ?? [])
                .slice(0, 4)
                .map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Value props */}
      <section className="bg-tint2">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <span className="eyebrow text-teal">Why learners stay</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything you need to finish
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: Zap,
                color: 'bg-primary',
                title: 'Modern video player',
                desc: 'Resume playback, speed controls, keyboard shortcuts and picture-in-picture.',
              },
              {
                icon: ShieldCheck,
                color: 'bg-teal',
                title: 'Secure by design',
                desc: 'Signed, enrollment-gated streaming and verified Razorpay payments.',
              },
              {
                icon: IndianRupee,
                color: 'bg-amber',
                title: 'Fair pricing',
                desc: 'Pay once and learn forever, plus plenty of free courses to start.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="pop p-6">
                <span
                  className={
                    'flex h-14 w-14 items-center justify-center rounded-2xl text-white ' +
                    color
                  }
                >
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <span className="eyebrow text-teal">Loved by learners</span>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Don’t just take our word for it
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="pop flex h-full flex-col p-6">
              <div className="flex gap-0.5 text-amber" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 font-medium leading-relaxed text-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 border-t-2 border-dashed border-border pt-4">
                <p className="font-bold">{t.name}</p>
                <p className="text-sm font-medium text-muted-foreground">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-tint2">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="eyebrow">FAQ</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {FAQS.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-foreground px-6 py-16 text-center text-background sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute -right-16 -top-20 -z-10 h-[320px] w-[320px] rounded-full bg-[#FF8A6B] opacity-30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-10 -z-10 h-[280px] w-[280px] rounded-full bg-[#7C6BFF] opacity-25 blur-3xl"
            aria-hidden
          />
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            {isAuthenticated ? 'Keep the momentum going' : 'Start learning today'}
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-medium text-background/70">
            {isAuthenticated
              ? 'Jump back into your dashboard and pick up where you left off.'
              : 'Join free, enroll in your first course, and build something real this week.'}
          </p>
          <Button size="lg" asChild className="mt-8">
            <Link to={isAuthenticated ? dashboardPath : '/signup'}>
              {isAuthenticated ? 'Go to dashboard' : 'Create free account'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
