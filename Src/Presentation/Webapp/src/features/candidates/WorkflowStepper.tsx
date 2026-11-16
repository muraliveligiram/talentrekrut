import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApplicationStage } from './candidateTypes'

type StepState = 'done' | 'current' | 'failed' | 'upcoming'

const steps = ['Screening', 'Shortlisted', 'Interview', 'Decision'] as const

function stepStates(stage: ApplicationStage): StepState[] {
  switch (stage) {
    case 'Screening':
      return ['current', 'upcoming', 'upcoming', 'upcoming']
    case 'NotShortlisted':
      return ['done', 'failed', 'upcoming', 'upcoming']
    case 'Shortlisted':
      return ['done', 'done', 'current', 'upcoming']
    case 'InterviewScheduled':
      return ['done', 'done', 'current', 'upcoming']
    case 'Selected':
      return ['done', 'done', 'done', 'done']
    case 'Rejected':
      return ['done', 'done', 'done', 'failed']
  }
}

export function WorkflowStepper({ stage }: { stage: ApplicationStage }) {
  const states = stepStates(stage)
  return (
    <ol aria-label="Hiring progress" className="flex items-center gap-1.5">
      {steps.map((label, index) => {
        const state = states[index]
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={state === 'current' ? 'step' : undefined}>
            <span
              className={cn(
                'h-1.5 rounded-full',
                state === 'done' && 'bg-primary',
                state === 'current' && 'bg-primary/40',
                state === 'failed' && 'bg-danger',
                state === 'upcoming' && 'bg-surface-muted',
              )}
            />
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] font-medium',
                state === 'upcoming' ? 'text-muted' : 'text-foreground',
                state === 'failed' && 'text-danger',
              )}
            >
              {state === 'done' && <Check aria-hidden className="size-3 text-primary" />}
              {state === 'failed' && <X aria-hidden className="size-3" />}
              {label}
              <span className="sr-only">
                {state === 'done' ? '(complete)' : state === 'failed' ? '(not passed)' : state === 'current' ? '(in progress)' : ''}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
