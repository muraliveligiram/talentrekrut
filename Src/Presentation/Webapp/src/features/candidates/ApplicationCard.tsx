import { CalendarCheck, CalendarClock, Check, ChevronRight, CircleAlert, ClipboardCheck, Gavel, UserCheck, UserMinus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { JobStatusBadge } from '@/features/jobs/JobStatusBadge'
import { cn, formatDate } from '@/lib/utils'
import {
  ACTIONABLE_STAGES,
  activeRound,
  levelLabels,
  notJoiningReasonLabels,
  rejectionReasonLabels,
  stageLabels,
  type Application,
  type RoundProgress,
  type StageChange,
} from './candidateTypes'
import { StageBadge } from './StageBadge'
import type { WorkflowAction } from './WorkflowDialogs'
import { WorkflowStepper } from './WorkflowStepper'

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/** Formats a "yyyy-mm-dd" date in the user's locale without time-zone shifts. */
function formatIsoDate(value: string) {
  return dateOnly.format(new Date(`${value}T00:00:00`))
}

/** Describes a timeline entry, e.g. "Round 2 · Face to face scheduled". */
function describeChange(change: StageChange) {
  if (change.fromStage === null) return 'Submitted for screening'
  if (change.toStage === 'InterviewScheduled') {
    const verb = change.fromStage === 'InterviewScheduled' ? 'rescheduled' : 'scheduled'
    return `${change.roundName ?? 'Interview'} ${verb}`
  }
  if (change.roundName && change.toStage === 'RoundCleared') return `${change.roundName} cleared`
  if (change.roundName && change.toStage === 'Rejected') return `${change.roundName} not cleared · Rejected`
  if (change.roundName && change.toStage === 'Selected') return `${change.roundName} cleared · Selected`
  if (change.fromStage === 'Selected' && change.toStage === 'Selected') return 'Date of joining set'
  return stageLabels[change.toStage]
}

const roundTone: Record<RoundProgress['status'], string> = {
  Upcoming: 'text-muted',
  Scheduled: 'text-warning-soft-foreground',
  Cleared: 'text-success-soft-foreground',
  NotCleared: 'text-danger',
}

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
  const round = activeRound(application.rounds)
  const roundLabel = round ? `round ${round.sequence} · ${round.name}` : 'interview'
  const reachedRounds = application.rounds.some((item) => item.status !== 'Upcoming')

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-surface p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {context === 'candidate' ? (
            <>
              <Link to={`/jobs/${application.jobId}`} className="truncate font-medium hover:underline">
                {application.jobTitle}
              </Link>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span>
                  {application.jobCode} · {application.companyName}
                </span>
                <span className="flex items-center gap-1">
                  <span className="sr-only">Job status:</span>
                  <JobStatusBadge status={application.jobStatus} />
                </span>
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

      {application.jobStatus && application.jobStatus !== 'Open' && ACTIONABLE_STAGES.includes(stage) && (
        <p className="flex items-start gap-2 rounded-lg border border-warning-soft-foreground/20 bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {application.jobStatus === 'Closed'
              ? 'This job is closed, but the candidate is still in progress. Close out their application or keep it for records.'
              : application.jobStatus === 'OnHold'
                ? 'This job is on hold. The candidate is still in progress.'
                : 'This job is in draft. The candidate is still in progress.'}
          </span>
        </p>
      )}

      <WorkflowStepper stage={stage} rounds={application.rounds} />

      {interviewAt && stage === 'InterviewScheduled' && (
        <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
          <CalendarClock aria-hidden className="size-4" />
          <span>
            {round ? `Round ${round.sequence} · ${round.name}` : 'Interview'} on{' '}
            <span className="font-medium">{dateTime.format(interviewAt)}</span>
          </span>
        </p>
      )}

      {reachedRounds && (
        <ol aria-label="Interview rounds" className="flex flex-col gap-1 text-sm">
          {application.rounds.map((item) => (
            <li key={item.sequence} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                  item.status === 'Cleared' && 'bg-success-soft text-success-soft-foreground',
                  item.status === 'NotCleared' && 'bg-danger-soft text-danger',
                  item.status === 'Scheduled' && 'bg-warning-soft text-warning-soft-foreground',
                  item.status === 'Upcoming' && 'bg-surface-muted text-muted',
                )}
              >
                {item.status === 'Cleared' ? <Check className="size-3" /> : item.status === 'NotCleared' ? <X className="size-3" /> : item.sequence}
              </span>
              <span className={cn('truncate', item.status === 'Upcoming' && 'text-muted')}>{item.name}</span>
              <span className={cn('ml-auto shrink-0 text-xs', roundTone[item.status])}>
                {item.status === 'Cleared'
                  ? `Cleared${item.decidedAt ? ` · ${dateOnly.format(new Date(item.decidedAt))}` : ''}`
                  : item.status === 'NotCleared'
                    ? 'Not cleared'
                    : item.status === 'Scheduled'
                      ? item.scheduledAt
                        ? dateTime.format(new Date(item.scheduledAt))
                        : 'Scheduled'
                      : stage === 'Rejected'
                        ? 'Not reached'
                        : 'Upcoming'}
              </span>
            </li>
          ))}
        </ol>
      )}

      {application.joiningDate && (
        <p
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            stage === 'NotJoined' ? 'bg-danger-soft text-danger-soft-foreground' : 'bg-success-soft text-success-soft-foreground',
          )}
        >
          <CalendarCheck aria-hidden className="size-4" />
          <span>
            {stage === 'Joined' ? 'Joined on' : stage === 'NotJoined' ? 'Was due to join on' : 'Joining on'}{' '}
            <span className="font-medium">{formatIsoDate(application.joiningDate)}</span>
          </span>
        </p>
      )}

      {application.notJoiningReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {application.notJoiningReasons.map((reason) => (
            <Badge key={reason} tone="danger">
              {notJoiningReasonLabels[reason]}
            </Badge>
          ))}
        </div>
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

      {ACTIONABLE_STAGES.includes(stage) && (
        <div className="flex flex-wrap gap-2">
          {stage === 'Screening' && (
            <Button size="sm" onClick={() => onAction(application, 'screen')}>
              <ClipboardCheck />
              Screen candidate
            </Button>
          )}
          {(stage === 'Shortlisted' || stage === 'RoundCleared') && (
            <Button size="sm" onClick={() => onAction(application, 'schedule')}>
              <CalendarClock />
              <span className="first-letter:uppercase">Schedule {roundLabel}</span>
            </Button>
          )}
          {stage === 'InterviewScheduled' && (
            <>
              <Button size="sm" onClick={() => onAction(application, 'outcome')}>
                <Gavel />
                Record result
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction(application, 'schedule')}>
                <CalendarClock />
                Reschedule
              </Button>
            </>
          )}
          {stage === 'Selected' && (
            <>
              {application.joiningDate && (
                <Button size="sm" onClick={() => onAction(application, 'joining')}>
                  <UserCheck />
                  Record joining
                </Button>
              )}
              <Button
                size="sm"
                variant={application.joiningDate ? 'outline' : 'primary'}
                onClick={() => onAction(application, 'joiningDate')}
              >
                <CalendarCheck />
                {application.joiningDate ? 'Change joining date' : 'Set date of joining'}
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
                <span className="font-medium">{describeChange(change)}</span>
                {change.interviewScheduledAt && (
                  <span className="text-muted"> · for {dateTime.format(new Date(change.interviewScheduledAt))}</span>
                )}
                {change.joiningDate && change.toStage === 'Selected' && (
                  <span className="text-muted"> · {formatIsoDate(change.joiningDate)}</span>
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
