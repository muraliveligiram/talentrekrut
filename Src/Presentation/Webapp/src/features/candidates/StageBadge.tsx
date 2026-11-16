import { Badge } from '@/components/ui/badge'
import { stageLabels, stageTone, type ApplicationStage } from './candidateTypes'

export function StageBadge({ stage }: { stage: ApplicationStage }) {
  return (
    <Badge tone={stageTone[stage]} dot>
      {stageLabels[stage]}
    </Badge>
  )
}
