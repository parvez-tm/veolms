import { Link } from 'react-router-dom'
import { Compass, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-tint px-4">
      <div className="pointer-events-none absolute -top-24 -right-16 -z-10 h-80 w-80 rounded-full bg-[#ffb59c] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 -z-10 h-72 w-72 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />

      <div className="pop mx-auto flex max-w-md flex-col items-center px-8 py-12 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
          <Compass className="size-7" />
        </div>
        <span className="eyebrow">Lost your way?</span>
        <p className="font-grotesk mt-3 text-7xl font-extrabold tracking-tight text-primary-strong">
          404
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 font-medium text-muted-foreground">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Button asChild className="mt-7">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}

export function ForbiddenPage() {
  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-tint2 px-4">
      <div className="pointer-events-none absolute -top-24 -left-16 -z-10 h-80 w-80 rounded-full bg-[#a7ecdd] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 -z-10 h-72 w-72 rounded-full bg-[#ffb59c] opacity-70 blur-3xl" />

      <div className="pop mx-auto flex max-w-md flex-col items-center px-8 py-12 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber text-white">
          <Lock className="size-7" />
        </div>
        <span className="eyebrow">Hold up</span>
        <p className="font-grotesk mt-3 text-7xl font-extrabold tracking-tight text-primary-strong">
          403
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
          Access denied
        </h1>
        <p className="mt-2 font-medium text-muted-foreground">
          You don’t have permission to view this page.
        </p>
        <Button asChild className="mt-7">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
