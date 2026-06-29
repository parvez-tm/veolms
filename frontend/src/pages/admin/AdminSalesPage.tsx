import { IndianRupee, ShoppingBag, Users } from 'lucide-react'
import { useAllPayments, type PaymentRow } from '@/features/admin/sales'
import { Decor } from '@/components/layout/Decor'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'

function statusTone(status: PaymentRow['status']): BadgeTone {
  if (status === 'paid') return 'success'
  if (status === 'failed') return 'danger'
  return 'neutral'
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="pop p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={'flex h-10 w-10 items-center justify-center rounded-2xl text-white ' + color}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 font-grotesk text-3xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

export function AdminSalesPage() {
  const { data, isLoading, isError } = useAllPayments()
  const payments = data ?? []
  const paid = payments.filter((p) => p.status === 'paid')
  const revenue = paid.reduce((sum, p) => sum + p.amount, 0)
  const uniqueStudents = new Set(paid.map((p) => p.userId)).size

  const studentName = (p: PaymentRow) =>
    p.user
      ? `${p.user.firstName ?? ''} ${p.user.lastName ?? ''}`.trim() || p.user.email
      : `User #${p.userId}`

  return (
    <div className="space-y-8">
      <div className="relative">
        <Decor className="rounded-[22px]">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#ffb59c] opacity-70 blur-3xl" />
        </Decor>
        <span className="eyebrow">Revenue</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Sales &amp; enrollments
        </h1>
        <p className="mt-3 font-medium text-muted-foreground">
          Every paid purchase across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value={isLoading ? '…' : formatPrice(revenue)} icon={IndianRupee} color="bg-primary" />
        <StatCard label="Paid orders" value={isLoading ? '…' : paid.length} icon={ShoppingBag} color="bg-teal" />
        <StatCard label="Paying students" value={isLoading ? '…' : uniqueStudents} icon={Users} color="bg-amber" />
      </div>

      <div className="pop overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold tracking-tight">Transactions</h2>
        </div>
        {isLoading ? (
          <p className="px-5 py-10 text-sm font-medium text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="px-5 py-10 text-sm font-medium text-destructive">
            Couldn’t load payments (admin only).
          </p>
        ) : payments.length === 0 ? (
          <p className="px-5 py-12 text-center text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Course</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-tint/60">
                    <td className="px-5 py-3">
                      <div className="font-semibold">{studentName(p)}</div>
                      {p.user?.email && (
                        <div className="text-xs text-muted-foreground">{p.user.email}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {p.course?.title ?? `Course #${p.courseId}`}
                    </td>
                    <td className="px-5 py-3 font-grotesk font-bold tabular-nums text-primary-strong">
                      {formatPrice(p.amount, p.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(p.status)} className="capitalize">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
