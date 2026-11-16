import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const tones = {
  danger: { className: 'border-danger/30 bg-danger-soft text-danger-soft-foreground', Icon: AlertCircle },
  success: { className: 'border-success-soft-foreground/30 bg-success-soft text-success-soft-foreground', Icon: CheckCircle2 },
  info: { className: 'border-primary/20 bg-primary-soft text-primary-soft-foreground', Icon: Info },
} as const

interface AlertProps {
  tone?: keyof typeof tones
  title?: string
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'danger', title, children, className }: AlertProps) {
  const { className: toneClass, Icon } = tones[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', toneClass, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'opacity-90')}>{children}</div>}
      </div>
    </div>
  )
}
