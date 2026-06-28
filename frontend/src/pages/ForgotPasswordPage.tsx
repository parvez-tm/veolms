import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api, { apiErrorMessage } from '@/lib/api'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/user/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the reset link'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="pop p-8">
        <span className="eyebrow">Account help</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Reset your password</h1>
        {sent ? (
          <>
            <p className="mt-3 font-medium text-muted-foreground">
              If <strong>{email}</strong> is registered, we've sent a link to reset your
              password. The link expires in 1 hour.
            </p>
            <Link to="/login" className="mt-6 inline-block font-bold text-primary-strong hover:underline">
              Back to log in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 font-medium text-muted-foreground">
              Enter your email and we'll send you a link to set a new password.
            </p>
            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
              Remembered it?{' '}
              <Link to="/login" className="font-bold text-primary-strong hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  )
}
