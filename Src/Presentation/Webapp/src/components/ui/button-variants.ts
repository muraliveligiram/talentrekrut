import { cn } from '@/lib/utils'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'

const variants = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
  secondary: 'bg-surface-muted text-foreground hover:bg-border',
  outline: 'border border-input bg-surface text-foreground shadow-xs hover:bg-surface-muted',
  ghost: 'text-foreground hover:bg-surface-muted',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-hover',
  link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4',
  lg: 'h-10 px-5',
  icon: 'size-9',
  'icon-sm': 'size-8',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className)
}
