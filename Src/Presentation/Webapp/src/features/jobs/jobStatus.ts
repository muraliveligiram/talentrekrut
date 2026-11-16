import type { BadgeTone } from '@/components/ui/badge'
import type { JobStatus } from './jobTypes'

export const JOB_STATUSES: JobStatus[] = ['Draft', 'Open', 'OnHold', 'Closed']

export const jobStatusTone: Record<JobStatus, BadgeTone> = {
  Draft: 'neutral',
  Open: 'success',
  OnHold: 'warning',
  Closed: 'danger',
}
