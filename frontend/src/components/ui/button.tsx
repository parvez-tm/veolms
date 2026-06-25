import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border-2 border-ink shadow-[2px_3px_0_var(--ink)] hover:bg-primary-strong hover:-translate-y-0.5 hover:shadow-[3px_5px_0_var(--ink)] active:translate-y-0 active:shadow-[1px_1px_0_var(--ink)]',
        destructive:
          'bg-destructive text-destructive-foreground border-2 border-ink shadow-[2px_3px_0_var(--ink)] hover:brightness-95 hover:-translate-y-0.5 hover:shadow-[3px_5px_0_var(--ink)] active:translate-y-0 active:shadow-[1px_1px_0_var(--ink)]',
        outline:
          'border-2 border-ink bg-card text-foreground shadow-[2px_3px_0_var(--ink)] hover:-translate-y-0.5 hover:bg-secondary hover:shadow-[3px_5px_0_var(--ink)] active:translate-y-0 active:shadow-[1px_1px_0_var(--ink)]',
        secondary:
          'bg-secondary text-secondary-foreground border-2 border-ink shadow-[2px_3px_0_var(--ink)] hover:brightness-[0.97] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_var(--ink)]',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-4',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}

export { Button, buttonVariants }
