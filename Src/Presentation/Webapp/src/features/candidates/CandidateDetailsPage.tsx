import { Briefcase, ExternalLink, Mail, Pencil, Phone, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DetailItem, DetailList } from '@/components/ui/detail-list'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/useAuth'
import { getErrorMessage } from '@/lib/api-error'
import { formatDate } from '@/lib/utils'
import { ApplicationCard } from './ApplicationCard'
import { RemoveApplicationDialog } from './RemoveApplicationDialog'
import { formatLpa, levelLabels, noticeLabel, type Application } from './candidateTypes'
import { SubmitToJobDialog } from './SubmitToJobDialog'
import { useCandidate, useDeleteCandidate } from './useCandidates'
import { WorkflowDialog, type WorkflowAction } from './WorkflowDialogs'

function age(dateOfBirth: string) {
  const dob = new Date(`${dateOfBirth}T00:00:00`)
  const now = new Date()
  let years = now.getFullYear() - dob.getFullYear()
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) years--
  return years
}

export function CandidateDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const query = useCandidate(id)
  const remove = useDeleteCandidate()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [removing, setRemoving] = useState<Application | null>(null)
  const [workflow, setWorkflow] = useState<{ application: Application; action: WorkflowAction } | null>(null)

  if (query.isLoading) return <PageLoader label="Loading candidate…" />
  if (query.isError || !query.data) {
    return <Alert title="Unable to find this candidate">They may have been removed or are not visible to you.</Alert>
  }

  const candidate = query.data
  // Re-read the application from fresh data so the dialog never acts on a stale stage.
  const activeApplication = workflow
    ? (candidate.applications.find((application) => application.id === workflow.application.id) ?? null)
    : null

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(candidate.id)
      toast.success('Candidate deleted', { description: candidate.fullName })
      navigate('/candidates', { replace: true })
    } catch {
      // Error shown in the dialog.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/candidates', label: 'Candidates' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={candidate.fullName} className="size-10 text-sm" />
            {candidate.fullName}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{levelLabels[candidate.level]}</Badge>
            <span>
              {candidate.currentRole} at {candidate.currentCompany}
            </span>
          </span>
        }
        actions={
          <>
            {isAdmin && (
              <Button
                variant="ghost"
                onClick={() => {
                  remove.reset()
                  setDeleteOpen(true)
                }}
                aria-label="Delete candidate"
              >
                <Trash2 />
              </Button>
            )}
            <ButtonLink to={`/candidates/${candidate.id}/edit`} variant="outline">
              <Pencil />
              Edit
            </ButtonLink>
            <Button onClick={() => setSubmitOpen(true)}>
              <Send />
              Submit to job
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section aria-labelledby="applications-heading" className="flex flex-col gap-3">
            <h2 id="applications-heading" className="text-base font-semibold">
              Job applications
            </h2>
            {candidate.applications.length ? (
              candidate.applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  context="candidate"
                  onAction={(app, action) => setWorkflow({ application: app, action })}
                  onRemove={isAdmin ? setRemoving : undefined}
                />
              ))
            ) : (
              <Card>
                <EmptyState
                  icon={Briefcase}
                  title="Not submitted to any job"
                  description="Submit this candidate to an open job to start screening."
                  action={
                    <Button size="sm" onClick={() => setSubmitOpen(true)}>
                      <Send />
                      Submit to job
                    </Button>
                  }
                />
              </Card>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={candidate.notes ? 'text-sm whitespace-pre-wrap' : 'text-sm text-muted'}>
                {candidate.notes ?? 'No notes yet.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 hover:underline">
                <Phone aria-hidden className="size-4 text-muted" />
                {candidate.phone}
              </a>
              <a href={`mailto:${candidate.personalEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail aria-hidden className="size-4" />
                {candidate.personalEmail}
                <span className="text-xs text-muted">personal</span>
              </a>
              {candidate.companyEmail && (
                <a href={`mailto:${candidate.companyEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Mail aria-hidden className="size-4" />
                  {candidate.companyEmail}
                  <span className="text-xs text-muted">work</span>
                </a>
              )}
              {candidate.linkedInUrl && (
                <a
                  href={candidate.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink aria-hidden className="size-4" />
                  LinkedIn profile
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList className="sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <DetailItem label="Current CTC">
                  {formatLpa(candidate.currentCtcLpa)}
                  {candidate.currentCtcIncludesVariable && (
                    <span className="block text-xs text-muted">
                      incl. variable{candidate.variablePayLpa !== null ? ` of ${formatLpa(candidate.variablePayLpa)}` : ''}
                    </span>
                  )}
                </DetailItem>
                <DetailItem label="Expected CTC">{formatLpa(candidate.expectedCtcLpa)}</DetailItem>
                <DetailItem label="Notice period">{noticeLabel(candidate.noticePeriodDays)}</DetailItem>
                <DetailItem label="Date of birth">
                  {formatDate(`${candidate.dateOfBirth}T00:00:00`)}{' '}
                  <span className="text-muted">({age(candidate.dateOfBirth)} yrs)</span>
                </DetailItem>
                <DetailItem label="Sourced by">{candidate.sourcedByName}</DetailItem>
                <DetailItem label="Added">{formatDate(candidate.createdAt)}</DetailItem>
              </DetailList>
            </CardContent>
          </Card>
        </div>
      </div>

      <SubmitToJobDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        candidateId={candidate.id}
        candidateName={candidate.fullName}
        excludeJobIds={candidate.applications.map((application) => application.jobId)}
      />
      <WorkflowDialog
        application={activeApplication}
        action={workflow?.action ?? null}
        onClose={() => setWorkflow(null)}
      />
      {isAdmin && <RemoveApplicationDialog application={removing} onClose={() => setRemoving(null)} />}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete candidate?"
        description={`${candidate.fullName} and their job applications will be removed from all pipelines.`}
        confirmLabel="Delete candidate"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error, 'Unable to delete the candidate.') : null}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
