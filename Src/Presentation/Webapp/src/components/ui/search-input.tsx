import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'

export function SearchInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <div className={cn('relative', className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <Input type="search" className="pl-9" {...props} />
    </div>
  )
}
