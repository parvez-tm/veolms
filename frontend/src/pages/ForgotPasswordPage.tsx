import { Link } from 'react-router-dom'
import { MailWarning } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'

/**
 * Password reset is email-driven, and this demo has no email provider configured,
 * so the flow is presented as a "coming soon" notice instead of a working form.
 * The reset endpoints still exist on the backend, ready for when email is enabled.
 */
export function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="pop p-8">
        <span className="eyebrow">Account help</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Reset your password</h1>
        <div className="mt-5 flex gap-3 rounded-xl border-2 border-amber/40 bg-amber/10 px-4 py-3">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
          <p className="text-sm font-medium text-foreground">
            Email delivery isn&apos;t set up in this demo, so password reset links can&apos;t
            be sent yet. This will be enabled in the future.
          </p>
        </div>
        <Link
          to="/login"
          className="mt-6 inline-block font-bold text-primary-strong hover:underline"
        >
          Back to log in
        </Link>
      </div>
    </AuthShell>
  )
}
