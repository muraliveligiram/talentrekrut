import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Briefcase, CalendarClock, PauseCircle, UserSquare2, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { getPipelineStats } from '@/features/candidates/candidatesApi'
import { getJobs } from '@/features/jobs/jobsApi'
import { JobStatusBadge } from '@/features/jobs/JobStatusBadge'
import type { JobStatus } from '@/features/jobs/jobTypes'
import { getUsers } from '@/features/users/usersApi'
import { formatDate } from '@/lib/utils'

const noFilters = { search: '', companyId: '' }

function useJobCount(status: JobStatus) {
  return useQuery({
    queryKey: ['jobs', 'count', status],
    queryFn: async () => (await getJobs({ ...noFilters, status }, 1, 1)).totalCount,
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
  const { roles, user } = useAuth()
  const isAdmin = roles.includes('Admin')
  const openJobs = useJobCount('Open')
  const onHoldJobs = useJobCount('OnHold')
  const activeUsers = useQuery({
    queryKey: ['users', 'count', 'active'],
    queryFn: async () => (await getUsers({ search: '', role: '', status: 'active' }, 1, 1)).totalCount,
    enabled: isAdmin,
  })
  const pipeline = useQuery({
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
        description={isAdmin ? "Here's what's happening across your recruitment desk." : 'Your assigned work at a glance.'}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open jobs" icon={Briefcase} value={openJobs.data} loading={openJobs.isLoading} to="/jobs" />
        {isAdmin ? (
          <StatCard label="Active users" icon={Users} value={activeUsers.data} loading={activeUsers.isLoading} to="/users" />
        ) : (
          <StatCard label="Jobs on hold" icon={PauseCircle} value={onHoldJobs.data} loading={onHoldJobs.isLoading} to="/jobs" />
        )}
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
      </div>

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
            description={isAdmin ? 'Create a job to start tracking requirements.' : 'Jobs assigned to you will appear here.'}
          />
        )}
      </Card>
    </div>
  )
}
