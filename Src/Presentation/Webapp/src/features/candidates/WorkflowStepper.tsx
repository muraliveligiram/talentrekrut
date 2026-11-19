import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  POST_SELECTION_STAGES,
  PRE_SHORTLIST_STAGES,
  type ApplicationStage,
  type RoundProgress,
} from './candidateTypes'

type StepState = 'done' | 'current' | 'failed' | 'upcoming'

interface Step {
  label: string
  state: StepState
  /** The final "Joined" step: a failure there doesn't hide earlier progress. */
  isJoining?: boolean
}

/** Labels of the fixed steps around the job's interview rounds. */
const STEP_LABELS = {
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  /** Used when a job has no interview rounds defined. */
  defaultRound: 'Interview',
  selected: 'Selected',
  joined: 'Joined',
} as const

/** Shown when a job has no rounds defined, so the stepper still has an interview step. */
const DEFAULT_ROUNDS: readonly RoundProgress[] = [
  { sequence: 1, name: STEP_LABELS.defaultRound, status: 'Upcoming', scheduledAt: null, decidedAt: null },
]

const BAR_CLASS: Record<StepState, string> = {
  done: 'bg-primary',
  current: 'bg-primary/40',
  failed: 'bg-danger',
  upcoming: 'bg-surface-muted',
}

/** Screen-reader suffix for each step, since the bar colour alone doesn't convey state. */
const STATE_TEXT: Record<StepState, string> = {
  done: '(complete)',
  current: '(in progress)',
  failed: '(not passed)',
  upcoming: '',
}

function roundState(round: RoundProgress, isNext: boolean): StepState {
  switch (round.status) {
    case 'Cleared':
      return 'done'
    case 'NotCleared':
      return 'failed'
    case 'Scheduled':
      return 'current'
    default:
      return isNext ? 'current' : 'upcoming'
  }
}

/**
 * Screening → Shortlisted → each interview round (by name) → Selected → Joined.
 * Round states come from the candidate's round progress; the rest from the stage.
 */
function buildSteps(stage: ApplicationStage, rounds: RoundProgress[]): Step[] {
  const shortlisted = !PRE_SHORTLIST_STAGES.includes(stage)
  const selected = POST_SELECTION_STAGES.includes(stage)

  const steps: Step[] = [
    { label: STEP_LABELS.screening, state: stage === 'Screening' ? 'current' : 'done' },
    {
      label: STEP_LABELS.shortlisted,
      state: stage === 'NotShortlisted' ? 'failed' : shortlisted ? 'done' : 'upcoming',
    },
  ]

  const interviewRounds = rounds.length ? rounds : DEFAULT_ROUNDS
  // While interviewing with nothing scheduled, the first upcoming round is the one in progress.
  const nextUpcoming =
    shortlisted && !selected && stage !== 'Rejected' && !interviewRounds.some((round) => round.status === 'Scheduled')
      ? interviewRounds.find((round) => round.status === 'Upcoming')
      : undefined
  for (const round of interviewRounds) {
    steps.push({ label: round.name, state: roundState(round, round === nextUpcoming) })
  }

  steps.push({ label: STEP_LABELS.selected, state: selected ? 'done' : stage === 'Rejected' ? 'failed' : 'upcoming' })
  steps.push({
    label: STEP_LABELS.joined,
    isJoining: true,
    state: stage === 'Joined' ? 'done' : stage === 'NotJoined' ? 'failed' : stage === 'Selected' ? 'current' : 'upcoming',
  })

  // Steps after a failure were never reached.
  const failedAt = steps.findIndex((step) => step.state === 'failed')
  if (failedAt >= 0 && !steps[failedAt].isJoining) {
    for (let index = failedAt + 1; index < steps.length; index++) {
      steps[index] = { ...steps[index], state: 'upcoming' }
    }
  }
  return steps
}

export function WorkflowStepper({ stage, rounds }: { stage: ApplicationStage; rounds: RoundProgress[] }) {
  const steps = buildSteps(stage, rounds)
  return (
    <ol aria-label="Hiring progress" className="flex items-start gap-1.5">
      {steps.map((step, index) => (
        <li
          key={`${index}-${step.label}`}
          className="flex min-w-0 flex-1 flex-col gap-1.5"
          aria-current={step.state === 'current' ? 'step' : undefined}
        >
          <span className={cn('h-1.5 rounded-full', BAR_CLASS[step.state])} />
          <span
            title={step.label}
            className={cn(
              'flex items-center gap-1 truncate text-[11px] font-medium',
              step.state === 'upcoming' ? 'text-muted' : 'text-foreground',
              step.state === 'failed' && 'text-danger',
            )}
          >
            {step.state === 'done' && <Check aria-hidden className="size-3 shrink-0 text-primary" />}
            {step.state === 'failed' && <X aria-hidden className="size-3 shrink-0" />}
            <span className="truncate">{step.label}</span>
            <span className="sr-only">{STATE_TEXT[step.state]}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
