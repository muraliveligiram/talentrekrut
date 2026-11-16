import { Badge } from '@/components/ui/badge'
import { humanize } from '@/lib/utils'
import { jobStatusTone } from './jobStatus'
import type { JobStatus } from './jobTypes'

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge tone={jobStatusTone[status]} dot>
      {humanize(status)}
    </Badge>
  )
}
