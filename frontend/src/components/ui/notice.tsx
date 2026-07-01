import * as React from 'react'
import { Info, AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NoticeTone = 'info' | 'warning' | 'future'

const TONES: Record<
  NoticeTone,
  { wrap: string; icon: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    wrap: 'border-foreground/10 bg-secondary/50',
    icon: 'text-primary-strong',
    Icon: Info,
  },
  warning: {
    wrap: 'border-amber/40 bg-amber/10',
    icon: 'text-amber',
    Icon: AlertTriangle,
  },
  // "Planned but not in scope yet" — used to flag preview / roadmap features.
  future: {
    wrap: 'border-violet/30 bg-violet/10',
    icon: 'text-violet',
    Icon: Sparkles,
  },
}

/**
 * A small inline callout for status/limitation messages (e.g. flagging a feature
 * as a preview that isn't enforced yet). Reusable anywhere a heads-up is needed.
 */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: NoticeTone
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const t = TONES[tone]
  const Icon = t.Icon
  return (
    <div
      className={cn(
        'flex gap-3 rounded-2xl border-2 px-4 py-3.5',
        t.wrap,
        className
      )}
      role="note"
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', t.icon)} />
      <div className="min-w-0 text-sm">
        {title && <p className="font-bold tracking-tight text-foreground">{title}</p>}
        {children && (
          <div className={cn('font-medium text-muted-foreground', title && 'mt-0.5')}>
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
