import { CalendarCheck, CalendarClock, CircleCheck, CircleX, ThumbsDown, ThumbsUp, UserCheck, UserX } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ChoiceCards } from '@/components/ui/choice-cards'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/api-error'
import {
  activeRound,
  NOT_JOINING_REASONS,
  notJoiningReasonLabels,
  REJECTION_REASONS,
  rejectionReasonLabels,
  type Application,
  type NotJoiningReason,
  type RejectionReason,
} from './candidateTypes'
import { ReasonPicker } from './ReasonPicker'
import {
  useRecordJoining,
  useRecordOutcome,
  useScheduleInterview,
  useScreenApplication,
  useSetJoiningDate,
} from './useCandidates'

export type WorkflowAction = 'screen' | 'schedule' | 'outcome' | 'joiningDate' | 'joining'

interface WorkflowDialogProps {
  application: Application | null
  action: WorkflowAction | null
  onClose: () => void
}

function roundLabel(application: Application) {
  const round = activeRound(application.rounds)
  return round ? `round ${round.sequence} · ${round.name}` : 'interview'
}

function dialogTitle(application: Application, action: WorkflowAction) {
  switch (action) {
    case 'screen':
      return 'Screening decision'
    case 'schedule':
      return `${application.stage === 'InterviewScheduled' ? 'Reschedule' : 'Schedule'} ${roundLabel(application)}`
    case 'outcome':
      return `Result of ${roundLabel(application)}`
    case 'joiningDate':
      return application.joiningDate ? 'Change date of joining' : 'Set date of joining'
    case 'joining':
      return 'Did the candidate join?'
  }
}

/** Opens the right step dialog for an application. Each dialog mounts fresh, so its state resets. */
export function WorkflowDialog({ application, action, onClose }: WorkflowDialogProps) {
  const open = application !== null && action !== null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {open && (
        <DialogContent
          title={dialogTitle(application, action)}
          description={`${application.candidateName} · ${application.jobTitle}`}
          className="max-w-xl"
        >
          {action === 'screen' && <ScreeningForm application={application} onDone={onClose} />}
          {action === 'schedule' && <ScheduleForm application={application} onDone={onClose} />}
          {action === 'outcome' && <OutcomeForm application={application} onDone={onClose} />}
          {action === 'joiningDate' && <JoiningDateForm application={application} onDone={onClose} />}
          {action === 'joining' && <JoiningForm application={application} onDone={onClose} />}
        </DialogContent>
      )}
    </Dialog>
  )
}

interface FormProps {
  application: Application
  onDone: () => void
}

function FormButtons({ submitLabel, pending, tone = 'primary', icon }: {
  submitLabel: string
  pending: boolean
  tone?: 'primary' | 'danger'
  icon?: ReactNode
}) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button type="submit" variant={tone} loading={pending}>
        {icon}
        {submitLabel}
      </Button>
    </DialogFooter>
  )
}

function ScreeningForm({ application, onDone }: FormProps) {
  const screen = useScreenApplication()
  const [decision, setDecision] = useState<'shortlist' | 'reject' | null>(null)
  const [reasons, setReasons] = useState<RejectionReason[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!decision) return setError('Choose whether to shortlist the candidate.')
    if (reasons.includes('Other') && !notes.trim()) return setError('Describe the reason when selecting "Other".')
    setError(null)
    try {
      await screen.mutateAsync({
        id: application.id,
        shortlisted: decision === 'shortlist',
        rejectionReasons: decision === 'reject' ? reasons : [],
        notes: notes.trim() || null,
      })
      toast.success(decision === 'shortlist' ? 'Candidate shortlisted' : 'Marked as not shortlisted', {
        description: application.candidateName,
      })
      onDone()
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to save the screening decision.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <ChoiceCards
        legend="Is the candidate a fit for this job?"
        value={decision}
        onChange={setDecision}
        choices={[
          { value: 'shortlist', label: 'Shortlist', description: 'Move on to the interview rounds.', icon: ThumbsUp },
          { value: 'reject', label: 'Not shortlisted', description: 'Close this application.', icon: ThumbsDown, tone: 'negative' },
        ]}
      />
      {decision === 'reject' && (
        <ReasonPicker
          legend="Reasons (optional)"
          options={REJECTION_REASONS}
          labels={rejectionReasonLabels}
          value={reasons}
          onChange={setReasons}
        />
      )}
      <Field label="Notes" hint="Visible in the application timeline.">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <FormButtons submitLabel="Save decision" pending={screen.isPending} tone={decision === 'reject' ? 'danger' : 'primary'} />
    </form>
  )
}

/** Formats a Date as the local "YYYY-MM-DDTHH:mm" value used by datetime-local inputs. */
function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ScheduleForm({ application, onDone }: FormProps) {
  const schedule = useScheduleInterview()
  const isReschedule = application.stage === 'InterviewScheduled'
  const [scheduledAt, setScheduledAt] = useState(() =>
    isReschedule && application.interviewScheduledAt ? toLocalInput(new Date(application.interviewScheduledAt)) : '',
  )
  const [notes, setNotes] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const round = activeRound(application.rounds)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const date = scheduledAt ? new Date(scheduledAt) : null
    if (!date || Number.isNaN(date.getTime())) return setFieldError('Choose the interview date and time.')
    if (date <= new Date()) return setFieldError('The interview must be scheduled in the future.')
    setFieldError(undefined)
    setError(null)
    try {
      await schedule.mutateAsync({ id: application.id, scheduledAt: date.toISOString(), notes: notes.trim() || null })
      toast.success(isReschedule ? 'Interview rescheduled' : 'Interview scheduled', {
        description: `${round ? `${round.name} · ` : ''}${date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`,
      })
      onDone()
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to schedule the interview.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Interview date and time" required error={fieldError} hint="Shown in your local time zone.">
        <Input
          type="datetime-local"
          min={toLocalInput(new Date())}
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
        />
      </Field>
      <Field label="Notes" hint="e.g. panel, meeting link, venue.">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <FormButtons
        submitLabel={isReschedule ? 'Reschedule' : 'Schedule interview'}
        pending={schedule.isPending}
        icon={<CalendarClock />}
      />
    </form>
  )
}

function OutcomeForm({ application, onDone }: FormProps) {
  const record = useRecordOutcome()
  const [decision, setDecision] = useState<'pass' | 'fail' | null>(null)
  const [reasons, setReasons] = useState<RejectionReason[]>([])
  const [notes, setNotes] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const round = activeRound(application.rounds)
  const isFinalRound = !round || round.sequence >= application.rounds.length

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!decision) return setError('Choose whether the candidate cleared this round.')
    if (decision === 'fail' && reasons.length === 0) return setReasonError('Select at least one rejection reason.')
    if (reasons.includes('Other') && !notes.trim()) return setReasonError('Describe the reason in the notes when selecting "Other".')
    setReasonError(undefined)
    setError(null)
    try {
      const updated = await record.mutateAsync({
        id: application.id,
        passed: decision === 'pass',
        rejectionReasons: decision === 'fail' ? reasons : [],
        notes: notes.trim() || null,
      })
      toast.success(
        updated.stage === 'Selected' ? 'Candidate selected' : decision === 'pass' ? 'Round cleared' : 'Candidate rejected',
        { description: application.candidateName },
      )
      onDone()
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to record the result.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <ChoiceCards
        legend="How did this round go?"
        value={decision}
        onChange={(value) => {
          setDecision(value)
          setReasonError(undefined)
        }}
        choices={[
          {
            value: 'pass',
            label: 'Cleared',
            description: isFinalRound
              ? 'Final round: the candidate will be marked Selected.'
              : 'Move on to the next round.',
            icon: CircleCheck,
          },
          { value: 'fail', label: 'Not cleared', description: 'Reject and record why.', icon: CircleX, tone: 'negative' },
        ]}
      />
      {decision === 'fail' && (
        <ReasonPicker
          legend="Rejection reasons"
          required
          options={REJECTION_REASONS}
          labels={rejectionReasonLabels}
          value={reasons}
          onChange={setReasons}
          error={reasonError}
        />
      )}
      <Field label="Interview feedback">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <FormButtons submitLabel="Save result" pending={record.isPending} tone={decision === 'fail' ? 'danger' : 'primary'} />
    </form>
  )
}

function isoDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

function JoiningDateForm({ application, onDone }: FormProps) {
  const setJoining = useSetJoiningDate()
  const [joiningDate, setJoiningDate] = useState(application.joiningDate ?? '')
  const [notes, setNotes] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const min = addDays(-90)
  const max = addDays(365)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!joiningDate) return setFieldError('Choose the date of joining.')
    if (joiningDate < min || joiningDate > max) return setFieldError('Choose a date within the last 90 days or the next year.')
    setFieldError(undefined)
    setError(null)
    try {
      await setJoining.mutateAsync({ id: application.id, joiningDate, notes: notes.trim() || null })
      toast.success('Date of joining saved', {
        description: new Date(`${joiningDate}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' }),
      })
      onDone()
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to save the date of joining.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Date of joining" required error={fieldError}>
        <Input type="date" min={min} max={max} value={joiningDate} onChange={(event) => setJoiningDate(event.target.value)} />
      </Field>
      <Field label="Notes" hint="e.g. offer details or onboarding contact.">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <FormButtons submitLabel="Save date" pending={setJoining.isPending} icon={<CalendarCheck />} />
    </form>
  )
}

function JoiningForm({ application, onDone }: FormProps) {
  const record = useRecordJoining()
  const [decision, setDecision] = useState<'joined' | 'notJoined' | null>(null)
  const [reasons, setReasons] = useState<NotJoiningReason[]>([])
  const [notes, setNotes] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const joiningDate = application.joiningDate
    ? new Date(`${application.joiningDate}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!decision) return setError('Choose whether the candidate joined.')
    if (decision === 'notJoined' && reasons.length === 0) return setReasonError('Select at least one reason for not joining.')
    if (reasons.includes('Other') && !notes.trim()) return setReasonError('Describe the reason in the notes when selecting "Other".')
    setReasonError(undefined)
    setError(null)
    try {
      await record.mutateAsync({
        id: application.id,
        joined: decision === 'joined',
        notJoiningReasons: decision === 'notJoined' ? reasons : [],
        notes: notes.trim() || null,
      })
      toast.success(decision === 'joined' ? 'Marked as joined' : 'Marked as not joined', {
        description: application.candidateName,
      })
      onDone()
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to record the joining status.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <ChoiceCards
        legend={joiningDate ? `Expected to join on ${joiningDate}` : 'Joining status'}
        value={decision}
        onChange={(value) => {
          setDecision(value)
          setReasonError(undefined)
        }}
        choices={[
          { value: 'joined', label: 'Joined', description: 'The candidate has started.', icon: UserCheck },
          { value: 'notJoined', label: 'Did not join', description: 'Record why they did not join.', icon: UserX, tone: 'negative' },
        ]}
      />
      {decision === 'notJoined' && (
        <ReasonPicker
          legend="Reasons for not joining"
          required
          options={NOT_JOINING_REASONS}
          labels={notJoiningReasonLabels}
          value={reasons}
          onChange={setReasons}
          error={reasonError}
        />
      )}
      <Field label="Notes">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <FormButtons submitLabel="Save" pending={record.isPending} tone={decision === 'notJoined' ? 'danger' : 'primary'} />
    </form>
  )
}
