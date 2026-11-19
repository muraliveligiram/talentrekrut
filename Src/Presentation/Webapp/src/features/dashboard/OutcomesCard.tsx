import { PieChart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { SubmissionOutcomes } from '@/features/candidates/candidatesApi'

interface OutcomesCardProps {
  days: number
  outcomes?: SubmissionOutcomes
  loading?: boolean
}

const rows: { key: keyof Omit<SubmissionOutcomes, 'submitted'>; label: string }[] = [
  { key: 'joined', label: 'Joined' },
  { key: 'selected', label: 'Selected, joining pending' },
  { key: 'notJoined', label: 'Selected but did not join' },
  { key: 'notShortlisted', label: 'Not shortlisted' },
  { key: 'rejected', label: 'Rejected in interviews' },
  { key: 'inProgress', label: 'Still in progress' },
]

const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 })

/**
 * A meter list: each outcome is a ratio against the same whole (profiles submitted in the window).
 * One hue throughout; the row label carries the meaning and the figure is always printed.
 */
export function OutcomesCard({ days, outcomes, loading }: OutcomesCardProps) {
  const total = outcomes?.submitted ?? 0

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Profile outcomes</CardTitle>
        <CardDescription>
          {loading
            ? `Profiles submitted in the last ${days} days`
            : `Where the ${total} profile${total === 1 ? '' : 's'} submitted in the last ${days} days stand today`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-5">
            {rows.map((row) => (
              <Skeleton key={row.key} className="h-9 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState icon={PieChart} title="No profiles submitted" description={`Nothing was submitted in the last ${days} days.`} />
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map(({ key, label }) => {
              const value = outcomes?.[key] ?? 0
              const share = value / total
              return (
                <li key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-foreground">{label}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{value}</span>
                      <span className="text-muted"> · {percent.format(share)}</span>
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={label}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={value}
                    aria-valuetext={`${value} of ${total} (${percent.format(share)})`}
                    title={`${label}: ${value} of ${total} (${percent.format(share)})`}
                    className="h-2 overflow-hidden rounded-full bg-surface-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${share * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
