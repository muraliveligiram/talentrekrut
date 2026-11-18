import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Award, Briefcase, CalendarClock, CircleCheck, PauseCircle, UserSquare2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth, useRoleFlags } from '@/features/auth/useAuth'
import { getErrorMessage } from '@/lib/api-error'
import { getPipelineInsights, getPipelineStats } from '@/features/candidates/candidatesApi'
import { getJobs } from '@/features/jobs/jobsApi'
import { JobStatusBadge } from '@/features/jobs/JobStatusBadge'
import type { JobStatus } from '@/features/jobs/jobTypes'
import { formatDate } from '@/lib/utils'
import { OutcomesCard } from './OutcomesCard'
import { RecruiterActivityCard } from './RecruiterActivityCard'

const reportingDays = 60

const noFilters = { search: '', companyId: '' }

function useJobCount(status: JobStatus, enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'count', status],
    queryFn: async () => (await getJobs({ ...noFilters, status }, 1, 1)).totalCount,
    enabled,
  })
}

interface StatCardProps {
  label: string
  icon: LucideIcon
  value?: number
  loading?: boolean
  hint?: string
  to?: string
}

function StatCard({ label, icon: Icon, value, loading, hint, to }: StatCardProps) {
  const body = (
    <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{value ?? '—'}</p>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  )
  return to ? (
    <Link to={to} className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  )
}

/** Monday 00:00 to the following Monday 00:00 in the viewer's local time. */
function currentWeek() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function DashboardPage() {
  const { user } = useAuth()
  const { isAdmin, isVendor } = useRoleFlags()
  const openJobs = useJobCount('Open')
  const onHoldJobs = useJobCount('OnHold', isVendor)
  const closedJobs = useJobCount('Closed', isVendor)
  const insights = useQuery({
    enabled: !isVendor,
    queryKey: ['applications', 'insights', reportingDays],
    queryFn: () => getPipelineInsights(reportingDays),
  })
  const pipeline = useQuery({
    enabled: !isVendor,
    queryKey: ['applications', 'stats', 'week'],
    queryFn: () => {
      const { start, end } = currentWeek()
      return getPipelineStats(start, end)
    },
  })
  const recentJobs = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: () => getJobs({ ...noFilters, status: '' }, 1, 5),
  })
  const firstName = user?.name.split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Recruitment overview'}
        description={
          isAdmin
            ? "Here's what's happening across your recruitment desk."
            : isVendor
              ? "Your company's job postings at a glance."
              : 'Your assigned work at a glance.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open jobs" icon={Briefcase} value={openJobs.data} loading={openJobs.isLoading} to="/jobs" />
        {isVendor ? (
          <>
            <StatCard label="On hold" icon={PauseCircle} value={onHoldJobs.data} loading={onHoldJobs.isLoading} to="/jobs" />
            <StatCard label="Closed" icon={CircleCheck} value={closedJobs.data} loading={closedJobs.isLoading} to="/jobs" />
          </>
        ) : (
          <>
            <StatCard
              label="Active candidates"
              icon={UserSquare2}
              value={pipeline.data?.activeCandidates}
              loading={pipeline.isLoading}
              hint="In screening, shortlisted or interviewing"
              to="/candidates"
            />
            <StatCard
              label="Interviews this week"
              icon={CalendarClock}
              value={pipeline.data?.interviewsInRange}
              loading={pipeline.isLoading}
              to="/candidates?stage=InterviewScheduled"
            />
            <StatCard
              label="Selected"
              icon={Award}
              value={insights.data?.selectedCount}
              loading={insights.isLoading}
              hint={`Candidates selected in the last ${reportingDays} days`}
              to="/candidates?stage=Selected"
            />
          </>
        )}
      </div>

      {!isVendor && (
        <>
          {insights.isError && <Alert>{getErrorMessage(insights.error, 'Unable to load hiring insights.')}</Alert>}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <OutcomesCard days={reportingDays} outcomes={insights.data?.outcomes} loading={insights.isLoading} />
            </div>
            <div className="lg:col-span-3">
              <RecruiterActivityCard
                days={reportingDays}
                recruiters={insights.data?.recruiters}
                loading={insights.isLoading}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent jobs</CardTitle>
          <ButtonLink to="/jobs" variant="ghost" size="sm">
            View all
            <ArrowRight />
          </ButtonLink>
        </CardHeader>
        {recentJobs.isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : recentJobs.data?.items.length ? (
          <ul className="divide-y">
            {recentJobs.data.items.map((job) => (
              <li key={job.id}>
                <Link
                  to={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-muted/50 sm:px-6"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{job.title}</span>
                    <span className="truncate text-xs text-muted">
                      {job.companyName} · {job.jobCode} · {formatDate(job.createdAt)}
                    </span>
                  </div>
                  <JobStatusBadge status={job.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No jobs yet"
            description={
              isAdmin
                ? 'Create a job to start tracking requirements.'
                : isVendor
                  ? "Your company's job postings will appear here."
                  : 'Jobs assigned to you will appear here.'
            }
          />
        )}
      </Card>
    </div>
  )
}
