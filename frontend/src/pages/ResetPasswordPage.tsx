import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api, { apiErrorMessage } from '@/lib/api'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/user/reset-password', { token, password })
      navigate('/login', { replace: true, state: { reset: true } })
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset your password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="pop p-8">
        <span className="eyebrow">Account help</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Set a new password</h1>
        {!token ? (
          <p className="mt-3 font-medium text-destructive">
            This reset link is missing its token. Please request a new one.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
          <Link to="/forgot-password" className="font-bold text-primary-strong hover:underline">
            Request a new link
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
