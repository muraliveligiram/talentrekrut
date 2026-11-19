import { Badge } from '@/components/ui/badge'
import { humanize } from '@/lib/utils'
import { jobStatusTone } from './jobStatus'
import type { JobStatus } from './jobTypes'

export function JobStatusBadge({ status }: { status: JobStatus | null | undefined }) {
  // Tolerate responses from an older API that doesn't send a status yet.
  if (!status) return null
  return (
    <Badge tone={jobStatusTone[status]} dot>
      {humanize(status)}
    </Badge>
  )
}
