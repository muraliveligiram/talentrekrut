import { Briefcase, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/useAuth'
import { useCompanies } from '@/features/companies/useCompanies'
import { getErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/lib/hooks'
import { formatDate, humanize } from '@/lib/utils'
import { JOB_STATUSES } from './jobStatus'
import { JobStatusBadge } from './JobStatusBadge'
import type { JobStatus } from './jobTypes'
import { useJobs } from './useJobs'

const pageSize = 10

export function JobListPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [companyId, setCompanyId] = useState(searchParams.get('companyId') ?? '')
  const [status, setStatus] = useState<JobStatus | ''>('')
  const [page, setPage] = useState(1)
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const companiesQuery = useCompanies('', 1, 100)
  const debouncedSearch = useDebouncedValue(search)
  const jobsQuery = useJobs({ search: debouncedSearch, companyId, status }, page, pageSize)
  const jobs = jobsQuery.data?.items ?? []
  const hasFilters = Boolean(search || companyId || status)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jobs"
        description={isAdmin ? 'Job requirements and recruiter assignments.' : 'Jobs assigned to you.'}
        actions={
          isAdmin && (
            <ButtonLink to="/jobs/new">
              <Plus />
              Add job
            </ButtonLink>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:px-6">
          <SearchInput
            aria-label="Search jobs"
            placeholder="Search title, code or location…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="sm:max-w-xs sm:flex-1"
          />
          <div className="flex gap-3">
            <Select
              aria-label="Filter by company"
              value={companyId}
              onChange={(event) => {
                setCompanyId(event.target.value)
                setPage(1)
              }}
              className="flex-1 sm:w-48"
            >
              <option value="">All companies</option>
              {(companiesQuery.data?.items ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as JobStatus | '')
                setPage(1)
              }}
              className="flex-1 sm:w-40"
            >
              <option value="">All statuses</option>
              {JOB_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {jobsQuery.isError ? (
          <div className="p-6">
            <Alert title="Unable to load jobs">{getErrorMessage(jobsQuery.error, 'Please try again.')}</Alert>
          </div>
        ) : !jobsQuery.isLoading && jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={hasFilters ? 'No matching jobs' : 'No jobs yet'}
            description={
              hasFilters
                ? 'Try different filters.'
                : isAdmin
                  ? 'Create a job to start tracking a requirement.'
                  : 'Jobs assigned to you will appear here.'
            }
            action={
              isAdmin &&
              !hasFilters && (
                <ButtonLink to="/jobs/new" size="sm">
                  <Plus />
                  Add job
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Job</TableHead>
                  <TableHead className="hidden md:table-cell">Company</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Openings</TableHead>
                  <TableHead className="hidden xl:table-cell">Recruiters</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsQuery.isLoading
                  ? Array.from({ length: 4 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <Link to={`/jobs/${job.id}`} className="truncate font-medium hover:underline">
                              {job.title}
                            </Link>
                            <span className="text-xs text-muted">
                              {job.jobCode} · {formatDate(job.createdAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{job.companyName}</TableCell>
                        <TableCell className="hidden text-muted lg:table-cell">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {job.location || '—'} · {humanize(job.workMode)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <JobStatusBadge status={job.status} />
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{job.openings}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {job.assignments.length ? (
                            <div className="flex -space-x-2">
                              {job.assignments.slice(0, 4).map((assignment) => (
                                <span key={assignment.recruiterUserId} title={assignment.recruiterName}>
                                  <Avatar name={assignment.recruiterName} className="size-7 ring-2 ring-surface" />
                                </span>
                              ))}
                              {job.assignments.length > 4 && (
                                <span className="flex size-7 items-center justify-center rounded-full bg-surface-muted text-[10px] font-medium ring-2 ring-surface">
                                  +{job.assignments.length - 4}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted">Unassigned</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={jobsQuery.data?.totalCount ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  )
}
