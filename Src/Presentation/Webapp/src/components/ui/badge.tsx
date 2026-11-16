import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const tones = {
  neutral: 'bg-surface-muted text-muted ring-border',
  primary: 'bg-primary-soft text-primary-soft-foreground ring-primary/20',
  success: 'bg-success-soft text-success-soft-foreground ring-success-soft-foreground/20',
  warning: 'bg-warning-soft text-warning-soft-foreground ring-warning-soft-foreground/20',
  danger: 'bg-danger-soft text-danger-soft-foreground ring-danger/20',
} as const

export type BadgeTone = keyof typeof tones

interface BadgeProps extends ComponentProps<'span'> {
  tone?: BadgeTone
  dot?: boolean
}

export function Badge({ tone = 'neutral', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
