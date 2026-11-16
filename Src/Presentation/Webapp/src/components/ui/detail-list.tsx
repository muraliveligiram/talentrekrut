import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-8 gap-y-5 sm:grid-cols-2', className)}>{children}</dl>
}

export function DetailItem({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className={cn('flex flex-col gap-1', wide && 'sm:col-span-2')}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={cn('text-sm whitespace-pre-wrap', empty && 'text-muted')}>{empty ? '—' : children}</dd>
    </div>
  )
}
