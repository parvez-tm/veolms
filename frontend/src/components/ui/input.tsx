import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border-2 border-input bg-card px-3.5 py-2 text-sm font-medium transition-all placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-ink focus-visible:shadow-[3px_3px_0_var(--ink)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Input }
