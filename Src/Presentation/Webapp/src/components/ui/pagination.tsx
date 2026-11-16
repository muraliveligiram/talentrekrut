import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 border-t px-5 py-3 text-sm text-muted sm:px-6"
    >
      <p>
        {totalCount === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="font-medium text-foreground">{from}</span>–
            <span className="font-medium text-foreground">{to}</span> of{' '}
            <span className="font-medium text-foreground">{totalCount}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft />
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          Next
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
