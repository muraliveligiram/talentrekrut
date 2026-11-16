import { UserPlus, UserSquare2 } from 'lucide-react'
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
import { getErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/lib/hooks'
import {
  formatLpa,
  LEVELS,
  levelLabels,
  noticeLabel,
  STAGES,
  stageLabels,
  type ApplicationStage,
  type CandidateFilters,
} from './candidateTypes'
import { StageBadge } from './StageBadge'
import { useCandidates } from './useCandidates'

const pageSize = 10

export function CandidateListPage() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<CandidateFilters['level']>('')
  const [searchParams] = useSearchParams()
  const [stage, setStage] = useState<CandidateFilters['stage']>(() => {
    const value = searchParams.get('stage')
    return STAGES.includes(value as ApplicationStage) ? (value as ApplicationStage) : ''
  })
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const query = useCandidates({ search: debouncedSearch, level, stage }, page, pageSize)
  const candidates = query.data?.items ?? []
  const hasFilters = Boolean(search || level || stage)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Candidates"
        description="Profiles you've sourced and where they are in each job's pipeline."
        actions={
          <ButtonLink to="/candidates/new">
            <UserPlus />
            Add candidate
          </ButtonLink>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:px-6">
          <SearchInput
            aria-label="Search candidates"
            placeholder="Name, email, phone, company or role…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="sm:max-w-sm sm:flex-1"
          />
          <div className="flex gap-3">
            <Select
              aria-label="Filter by level"
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as CandidateFilters['level'])
                setPage(1)
              }}
              className="flex-1 sm:w-40"
            >
              <option value="">All levels</option>
              {LEVELS.map((value) => (
                <option key={value} value={value}>
                  {levelLabels[value]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by stage"
              value={stage}
              onChange={(event) => {
                setStage(event.target.value as CandidateFilters['stage'])
                setPage(1)
              }}
              className="flex-1 sm:w-48"
            >
              <option value="">Any stage</option>
              {STAGES.map((value) => (
                <option key={value} value={value}>
                  {stageLabels[value]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {query.isError ? (
          <div className="p-6">
            <Alert title="Unable to load candidates">{getErrorMessage(query.error, 'Please try again.')}</Alert>
          </div>
        ) : !query.isLoading && candidates.length === 0 ? (
          <EmptyState
            icon={UserSquare2}
            title={hasFilters ? 'No matching candidates' : 'No candidates yet'}
            description={hasFilters ? 'Try a different search or clear the filters.' : 'Add a candidate and submit them to an open job.'}
            action={
              !hasFilters && (
                <ButtonLink to="/candidates/new" size="sm">
                  <UserPlus />
                  Add candidate
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden md:table-cell">Level</TableHead>
                  <TableHead className="hidden lg:table-cell">CTC (current → expected)</TableHead>
                  <TableHead className="hidden sm:table-cell">Notice</TableHead>
                  <TableHead>Latest stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading
                  ? Array.from({ length: 4 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : candidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={candidate.fullName} />
                            <div className="flex min-w-0 flex-col">
                              <Link to={`/candidates/${candidate.id}`} className="truncate font-medium hover:underline">
                                {candidate.fullName}
                              </Link>
                              <span className="truncate text-xs text-muted">
                                {candidate.currentRole} · {candidate.currentCompany}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{levelLabels[candidate.level]}</TableCell>
                        <TableCell className="hidden tabular-nums lg:table-cell">
                          {formatLpa(candidate.currentCtcLpa)} <span className="text-muted">→</span>{' '}
                          {formatLpa(candidate.expectedCtcLpa)}
                        </TableCell>
                        <TableCell className="hidden text-muted sm:table-cell">{noticeLabel(candidate.noticePeriodDays)}</TableCell>
                        <TableCell>
                          {candidate.latestStage ? (
                            <div className="flex flex-col items-start gap-1">
                              <StageBadge stage={candidate.latestStage} />
                              {candidate.applicationCount > 1 && (
                                <span className="text-xs text-muted">{candidate.applicationCount} jobs</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted">Not submitted</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} totalCount={query.data?.totalCount ?? 0} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
