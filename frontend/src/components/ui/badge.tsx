import * as React from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'success' | 'neutral' | 'coral' | 'amber' | 'danger'

/** Semantic tone -> color. Keep statuses mapped consistently app-wide:
 *  published/paid/completed/active -> success; draft/pending -> neutral;
 *  failed -> danger; preview/free -> amber; level/highlight -> coral. */
const TONES: Record<BadgeTone, string> = {
  success: 'bg-teal/15 text-teal',
  neutral: 'bg-muted text-muted-foreground',
  coral: 'bg-secondary text-primary-strong',
  amber: 'bg-amber text-white',
  danger: 'bg-destructive/10 text-destructive',
}

/** The single small status/metadata pill used across the app. */
export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.ComponentProps<'span'> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        TONES[tone],
        className
      )}
      {...props}
    />
  )
}
