import { Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RecruiterActivity } from '@/features/candidates/candidatesApi'
import { cn } from '@/lib/utils'

interface RecruiterActivityCardProps {
  days: number
  recruiters?: RecruiterActivity[]
  loading?: boolean
  isAdmin: boolean
}

const columns: { key: keyof RecruiterActivity; label: string; className?: string }[] = [
  { key: 'processed', label: 'Processed' },
  { key: 'submitted', label: 'Submitted', className: 'hidden sm:table-cell' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'notShortlisted', label: 'Not shortlisted' },
  { key: 'selected', label: 'Selected' },
  { key: 'rejected', label: 'Rejected', className: 'hidden md:table-cell' },
]

export function RecruiterActivityCard({ days, recruiters, loading, isAdmin }: RecruiterActivityCardProps) {
  const rows = recruiters ?? []

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>Recruiter activity</CardTitle>
        <CardDescription>
          Candidates each person processed in the last {days} days{isAdmin ? '' : ' on your jobs'}. “Processed” counts
          any workflow step taken.
        </CardDescription>
      </CardHeader>
      {loading ? (
        <div className="flex flex-col gap-3 p-6">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No activity yet" description={`No candidates were processed in the last ${days} days.`} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Recruiter</TableHead>
              {columns.map((column) => (
                <TableHead key={column.key} className={cn('text-right', column.className)}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.userId}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.name} className="size-7" />
                    <span className="font-medium whitespace-nowrap">{row.name}</span>
                  </div>
                </TableCell>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      'text-right tabular-nums',
                      column.key === 'processed' && 'font-semibold',
                      row[column.key] === 0 && 'text-muted',
                      column.className,
                    )}
                  >
                    {row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
