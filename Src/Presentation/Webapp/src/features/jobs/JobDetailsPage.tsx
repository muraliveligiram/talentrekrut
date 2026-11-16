import { Pencil, UserMinus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DetailItem, DetailList } from '@/components/ui/detail-list'
import { Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/useAuth'
import { JobPipeline } from '@/features/candidates/JobPipeline'
import { getErrorMessage } from '@/lib/api-error'
import { formatDate, humanize } from '@/lib/utils'
import { JOB_STATUSES } from './jobStatus'
import { JobStatusBadge } from './JobStatusBadge'
import type { JobSkillType, JobStatus } from './jobTypes'
import { useAssignRecruiter, useJob, useRecruiters, useRemoveRecruiter, useUpdateJobStatus } from './useJobs'

const skillTypeOrder: JobSkillType[] = ['Primary', 'Secondary', 'GoodToHave']

export function JobDetailsPage() {
  const { id = '' } = useParams()
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const [recruiterId, setRecruiterId] = useState('')
  const jobQuery = useJob(id)
  const recruitersQuery = useRecruiters(isAdmin)
  const updateStatus = useUpdateJobStatus(id)
  const assignRecruiter = useAssignRecruiter(id)
  const removeRecruiter = useRemoveRecruiter(id)

  if (jobQuery.isLoading) {
    return <PageLoader label="Loading job…" />
  }
  if (jobQuery.isError || !jobQuery.data) {
    return <Alert title="Unable to find this job">It may have been removed or is not assigned to you.</Alert>
  }

  const job = jobQuery.data
  const assignedIds = new Set(job.assignments.map((assignment) => assignment.recruiterUserId))
  const availableRecruiters = (recruitersQuery.data ?? []).filter((recruiter) => !assignedIds.has(recruiter.id))
  const mutationError = assignRecruiter.error ?? removeRecruiter.error ?? updateStatus.error

  const handleStatusChange = (status: JobStatus) => {
    updateStatus.mutate(status, {
      onSuccess: () => toast.success(`Status changed to ${humanize(status)}`),
    })
  }

  const handleAssign = () => {
    if (!recruiterId) return
    const recruiter = availableRecruiters.find((option) => option.id === Number(recruiterId))
    assignRecruiter.mutate(Number(recruiterId), {
      onSuccess: () => {
        setRecruiterId('')
        toast.success('Recruiter assigned', { description: recruiter?.fullName })
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/jobs', label: 'Jobs' }}
        eyebrow={job.jobCode}
        title={job.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            {isAdmin ? (
              <Link to={`/companies/${job.companyId}`} className="hover:text-foreground hover:underline">
                {job.companyName}
              </Link>
            ) : (
              <span>{job.companyName}</span>
            )}
            <span aria-hidden>·</span>
            <span>Created {formatDate(job.createdAt)}</span>
          </span>
        }
        actions={
          isAdmin && (
            <>
              <Select
                aria-label="Job status"
                value={job.status}
                disabled={updateStatus.isPending}
                onChange={(event) => handleStatusChange(event.target.value as JobStatus)}
                className="w-36"
              >
                {JOB_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </Select>
              <ButtonLink to={`/jobs/${job.id}/edit`}>
                <Pencil />
                Edit job
              </ButtonLink>
            </>
          )
        }
      />

      {mutationError && <Alert>{getErrorMessage(mutationError, 'Unable to update this job. Refresh and try again.')}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList className="lg:grid-cols-3">
                <DetailItem label="Experience">
                  {job.minExperienceYears}–{job.maxExperienceYears} years
                </DetailItem>
                <DetailItem label="Openings">{job.openings}</DetailItem>
                <DetailItem label="Employment type">{humanize(job.employmentType)}</DetailItem>
                <DetailItem label="Location">{job.location}</DetailItem>
                <DetailItem label="Work mode">{job.workMode}</DetailItem>
                <DetailItem label="Communication">{job.communicationRequirement}</DetailItem>
              </DetailList>
              <div className="mt-6 border-t pt-5">
                <DetailItem label="Description">{job.description}</DetailItem>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {skillTypeOrder.map((type) => {
                const skills = job.skills.filter((skill) => skill.skillType === type)
                if (skills.length === 0) return null
                return (
                  <div key={type} className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted">{type === 'GoodToHave' ? 'Good to have' : type}</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill.id} tone={type === 'Primary' ? 'primary' : 'neutral'} className="py-1 text-[13px]">
                          {skill.skillName}
                          {skill.minYears ? <span className="opacity-70">· {skill.minYears}+ yrs</span> : null}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <JobPipeline jobId={id} isOpen={job.status === 'Open'} />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Recruiters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isAdmin && (
              <div className="flex gap-2">
                <Select
                  aria-label="Recruiter"
                  value={recruiterId}
                  onChange={(event) => setRecruiterId(event.target.value)}
                  className="flex-1"
                  disabled={recruitersQuery.isLoading}
                >
                  <option value="">
                    {availableRecruiters.length ? 'Select a recruiter…' : 'No recruiters available'}
                  </option>
                  {availableRecruiters.map((recruiter) => (
                    <option key={recruiter.id} value={recruiter.id}>
                      {recruiter.fullName}
                    </option>
                  ))}
                </Select>
                <Button onClick={handleAssign} disabled={!recruiterId} loading={assignRecruiter.isPending}>
                  <UserPlus />
                  Assign
                </Button>
              </div>
            )}
            {recruitersQuery.isError && <Alert>Unable to load recruiters.</Alert>}
            {job.assignments.length ? (
              <ul className="flex flex-col divide-y">
                {job.assignments.map((assignment) => (
                  <li key={assignment.recruiterUserId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={assignment.recruiterName} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{assignment.recruiterName}</span>
                      <span className="text-xs text-muted">Assigned {formatDate(assignment.assignedAt)}</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${assignment.recruiterName}`}
                        disabled={removeRecruiter.isPending}
                        onClick={() =>
                          removeRecruiter.mutate(assignment.recruiterUserId, {
                            onSuccess: () => toast.success('Recruiter removed', { description: assignment.recruiterName }),
                          })
                        }
                      >
                        <UserMinus />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No recruiters are assigned yet.</p>
            )}
            {isAdmin && (
              <p className="text-xs text-muted">
                Need someone new? <Link to="/users" className="text-primary hover:underline">Invite a recruiter</Link>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
