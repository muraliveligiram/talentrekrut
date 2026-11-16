import { CalendarClock, CircleCheck, CircleX, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ChoiceCards } from '@/components/ui/choice-cards'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/api-error'
import type { Application, RejectionReason } from './candidateTypes'
import { ReasonPicker } from './ReasonPicker'
import { useRecordOutcome, useScheduleInterview, useScreenApplication } from './useCandidates'

export type WorkflowAction = 'screen' | 'schedule' | 'outcome'

interface WorkflowDialogProps {
  application: Application | null
  action: WorkflowAction | null
  onClose: () => void
}

/** Opens the right step dialog for an application. Each dialog mounts fresh, so its state resets. */
export function WorkflowDialog({ application, action, onClose }: WorkflowDialogProps) {
  const open = application !== null && action !== null
  const subject = application ? `${application.candidateName} · ${application.jobTitle}` : undefined
  const title =
    action === 'screen' ? 'Screening decision' : action === 'schedule' ? scheduleTitle(application) : 'Interview outcome'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {open && (
        <DialogContent title={title} description={subject} className="max-w-xl">
          {action === 'screen' && <ScreeningForm application={application} onDone={onClose} />}
          {action === 'schedule' && <ScheduleForm application={application} onDone={onClose} />}
          {action === 'outcome' && <OutcomeForm application={application} onDone={onClose} />}
        </DialogContent>
      )}
    </Dialog>
  )
}

function scheduleTitle(application: Application | null) {
  return application?.stage === 'InterviewScheduled' ? 'Reschedule interview' : 'Schedule interview'
}

interface FormProps {
  application: Application
  onDone: () => void
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
          { value: 'shortlist', label: 'Shortlist', description: 'Move on to the interview stage.', icon: ThumbsUp },
          { value: 'reject', label: 'Not shortlisted', description: 'Close this application.', icon: ThumbsDown, tone: 'negative' },
        ]}
      />
      {decision === 'reject' && <ReasonPicker legend="Reasons (optional)" value={reasons} onChange={setReasons} />}
      <Field label="Notes" hint="Visible in the application timeline.">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant={decision === 'reject' ? 'danger' : 'primary'} loading={screen.isPending}>
          Save decision
        </Button>
      </DialogFooter>
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
  const [scheduledAt, setScheduledAt] = useState(() =>
    application.interviewScheduledAt ? toLocalInput(new Date(application.interviewScheduledAt)) : '',
  )
  const [notes, setNotes] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const isReschedule = application.stage === 'InterviewScheduled'

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
        description: date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
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
      <Field label="Notes" hint="e.g. panel, round, meeting link.">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={schedule.isPending}>
          <CalendarClock />
          {isReschedule ? 'Reschedule' : 'Schedule interview'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function OutcomeForm({ application, onDone }: FormProps) {
  const record = useRecordOutcome()
  const [decision, setDecision] = useState<'select' | 'reject' | null>(null)
  const [reasons, setReasons] = useState<RejectionReason[]>([])
  const [notes, setNotes] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!decision) return setError('Choose whether the candidate was selected or rejected.')
    if (decision === 'reject' && reasons.length === 0) return setReasonError('Select at least one rejection reason.')
    if (reasons.includes('Other') && !notes.trim()) return setReasonError('Describe the reason in the notes when selecting "Other".')
    setReasonError(undefined)
    setError(null)
    try {
      await record.mutateAsync({
        id: application.id,
        selected: decision === 'select',
        rejectionReasons: decision === 'reject' ? reasons : [],
        notes: notes.trim() || null,
      })
      toast.success(decision === 'select' ? 'Candidate selected' : 'Candidate rejected', {
        description: application.candidateName,
      })
      onDone()
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to record the interview outcome.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <ChoiceCards
        legend="How did the interview go?"
        value={decision}
        onChange={(value) => {
          setDecision(value)
          setReasonError(undefined)
        }}
        choices={[
          { value: 'select', label: 'Selected', description: 'The candidate cleared the interview.', icon: CircleCheck },
          { value: 'reject', label: 'Rejected', description: 'Record why the candidate was rejected.', icon: CircleX, tone: 'negative' },
        ]}
      />
      {decision === 'reject' && (
        <ReasonPicker legend="Rejection reasons" required value={reasons} onChange={setReasons} error={reasonError} />
      )}
      <Field label="Interview feedback">
        <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant={decision === 'reject' ? 'danger' : 'primary'} loading={record.isPending}>
          Save outcome
        </Button>
      </DialogFooter>
    </form>
  )
}
