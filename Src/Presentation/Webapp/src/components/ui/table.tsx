import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('bg-surface-muted/60 [&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-b transition-colors hover:bg-surface-muted/40', className)} {...props} />
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-medium tracking-wide whitespace-nowrap text-muted uppercase first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={cn('px-4 py-3 align-middle first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', className)}
      {...props}
    />
  )
}

/** A full-width row for loading, empty and error states. */
export function TableMessageRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  )
}
