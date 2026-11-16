import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn('size-4 animate-spin', className)} />
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted">
      <Spinner />
      {label}
    </div>
  )
}
