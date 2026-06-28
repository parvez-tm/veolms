import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { AuthShell } from '@/components/AuthShell'

type Status = 'verifying' | 'success' | 'error'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { refreshProfile, isAuthenticated, dashboardPath } = useAuth()
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // verify exactly once (StrictMode double-invoke guard)
    ran.current = true
    if (!token) {
      setStatus('error')
      setMessage('This verification link is missing its token.')
      return
    }
    api
      .post('/user/verify-email', { token })
      .then(async () => {
        setStatus('success')
        if (isAuthenticated) await refreshProfile()
      })
      .catch((err) => {
        setStatus('error')
        setMessage(apiErrorMessage(err, 'This verification link is invalid or has expired.'))
      })
  }, [token, isAuthenticated, refreshProfile])

  return (
    <AuthShell>
      <div className="pop p-8 text-center">
        <span className="eyebrow">Email verification</span>
        {status === 'verifying' && (
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Verifying your email…</h1>
        )}
        {status === 'success' && (
          <>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">You're verified! 🎉</h1>
            <p className="mt-2 font-medium text-muted-foreground">
              Your email has been confirmed.
            </p>
            <Link
              to={isAuthenticated ? dashboardPath : '/login'}
              className="mt-6 inline-block font-bold text-primary-strong hover:underline"
            >
              {isAuthenticated ? 'Go to your dashboard' : 'Log in'}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Verification failed</h1>
            <p className="mt-2 font-medium text-destructive">{message}</p>
            <Link to="/" className="mt-6 inline-block font-bold text-primary-strong hover:underline">
              Back home
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  )
}
