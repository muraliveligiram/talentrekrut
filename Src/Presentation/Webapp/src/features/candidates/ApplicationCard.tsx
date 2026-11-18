import { CalendarClock, ChevronRight, ClipboardCheck, Gavel, UserMinus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { levelLabels, rejectionReasonLabels, stageLabels, type Application } from './candidateTypes'
import { StageBadge } from './StageBadge'
import type { WorkflowAction } from './WorkflowDialogs'
import { WorkflowStepper } from './WorkflowStepper'

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface ApplicationCardProps {
  application: Application
  /** Which side to headline: the job (on a candidate page) or the candidate (on a job page). */
  context: 'candidate' | 'job'
  onAction: (application: Application, action: WorkflowAction) => void
  /** Vendors can't open candidate profiles, so the name is shown as plain text. */
  linkToCandidate?: boolean
  /** Admins only: shows a "Remove from job" action. */
  onRemove?: (application: Application) => void
}

export function ApplicationCard({ application, context, onAction, linkToCandidate = true, onRemove }: ApplicationCardProps) {
  const { stage } = application
  const interviewAt = application.interviewScheduledAt ? new Date(application.interviewScheduledAt) : null

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-surface p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {context === 'candidate' ? (
            <>
              <Link to={`/jobs/${application.jobId}`} className="truncate font-medium hover:underline">
                {application.jobTitle}
              </Link>
              <span className="text-xs text-muted">
                {application.jobCode} · {application.companyName}
              </span>
            </>
          ) : (
            <>
              {linkToCandidate ? (
                <Link to={`/candidates/${application.candidateId}`} className="truncate font-medium hover:underline">
                  {application.candidateName}
                </Link>
              ) : (
                <span className="truncate font-medium">{application.candidateName}</span>
              )}
              <span className="truncate text-xs text-muted">
                {application.candidateRole}
                {application.candidateCompany ? ` at ${application.candidateCompany}` : ''} ·{' '}
                {levelLabels[application.candidateLevel]}
              </span>
            </>
          )}
        </div>
        <StageBadge stage={stage} />
      </header>

      <WorkflowStepper stage={stage} />

      {interviewAt && stage === 'InterviewScheduled' && (
        <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
          <CalendarClock aria-hidden className="size-4" />
          Interview on <span className="font-medium">{dateTime.format(interviewAt)}</span>
        </p>
      )}

      {application.rejectionReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {application.rejectionReasons.map((reason) => (
            <Badge key={reason} tone="danger">
              {rejectionReasonLabels[reason]}
            </Badge>
          ))}
        </div>
      )}

      {(stage === 'Screening' || stage === 'Shortlisted' || stage === 'InterviewScheduled') && (
        <div className="flex flex-wrap gap-2">
          {stage === 'Screening' && (
            <Button size="sm" onClick={() => onAction(application, 'screen')}>
              <ClipboardCheck />
              Screen candidate
            </Button>
          )}
          {stage === 'Shortlisted' && (
            <Button size="sm" onClick={() => onAction(application, 'schedule')}>
              <CalendarClock />
              Schedule interview
            </Button>
          )}
          {stage === 'InterviewScheduled' && (
            <>
              <Button size="sm" onClick={() => onAction(application, 'outcome')}>
                <Gavel />
                Record outcome
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction(application, 'schedule')}>
                <CalendarClock />
                Reschedule
              </Button>
            </>
          )}
        </div>
      )}

      <details className="group text-sm">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden className="size-3.5 transition-transform group-open:rotate-90" />
          Timeline ({application.history.length})
        </summary>
        <ol className="mt-3 flex flex-col gap-3 border-l pl-4">
          {application.history.map((change) => (
            <li key={change.id} className="relative">
              <span aria-hidden className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-border ring-2 ring-surface" />
              <p className="text-sm">
                <span className="font-medium">
                  {change.fromStage === null
                    ? 'Submitted for screening'
                    : change.fromStage === change.toStage
                      ? 'Interview rescheduled'
                      : stageLabels[change.toStage]}
                </span>
                {change.interviewScheduledAt && (
                  <span className="text-muted"> · for {dateTime.format(new Date(change.interviewScheduledAt))}</span>
                )}
              </p>
              <p className="text-xs text-muted">
                {change.changedByName} · {dateTime.format(new Date(change.changedAt))}
              </p>
              {change.notes && <p className="mt-1 whitespace-pre-wrap text-muted">{change.notes}</p>}
            </li>
          ))}
        </ol>
      </details>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          Submitted by {application.submittedByName} on {formatDate(application.submittedAt)}
        </span>
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="-my-1 -mr-2 text-danger hover:bg-danger-soft hover:text-danger"
            onClick={() => onRemove(application)}
            aria-label={`Remove ${application.candidateName} from ${application.jobTitle}`}
          >
            <UserMinus />
            Remove from job
          </Button>
        )}
      </footer>
    </article>
  )
}
