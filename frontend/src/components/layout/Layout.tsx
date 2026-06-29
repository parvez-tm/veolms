import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MailWarning } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/** Non-blocking nudge for logged-in users who haven't verified their email. */
function VerifyBanner() {
  const { user } = useAuth()
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  // Only show when we know verification is explicitly pending.
  if (!user || user.isVerified !== false) return null

  const resend = async () => {
    setState('sending')
    try {
      await api.post('/user/resend-verification')
      setState('sent')
    } catch {
      setState('idle')
    }
  }

  return (
    <div className="border-b border-amber/40 bg-amber/15">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 py-2 text-sm font-medium sm:px-6">
        <MailWarning className="h-4 w-4 text-amber" />
        <span>Please verify your email to secure your account.</span>
        {state === 'sent' ? (
          <span className="font-semibold text-teal">Verification email sent.</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={state === 'sending'}
            className="font-bold text-primary-strong underline-offset-2 hover:underline disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : 'Resend link'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Public shell: sticky navbar + page outlet + footer. */
export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <VerifyBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
