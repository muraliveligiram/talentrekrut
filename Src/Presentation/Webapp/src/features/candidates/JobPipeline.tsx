import { FileSpreadsheet, UserPlus, UserSquare2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api-error'
import { saveBlob } from '@/lib/download'
import { cn } from '@/lib/utils'
import { ApplicationCard } from './ApplicationCard'
import { STAGES, stageLabels, type Application, type ApplicationStage } from './candidateTypes'
import { useExportJobApplications, useJobApplications } from './useCandidates'
import { WorkflowDialog, type WorkflowAction } from './WorkflowDialogs'

export function JobPipeline({ jobId, isOpen }: { jobId: string; isOpen: boolean }) {
  const query = useJobApplications(jobId)
  const exportToExcel = useExportJobApplications()
  const [filter, setFilter] = useState<ApplicationStage | ''>('')
  const [workflow, setWorkflow] = useState<{ id: number; action: WorkflowAction } | null>(null)
  const applications = query.data ?? []
  const counts = Object.fromEntries(
    STAGES.map((stage) => [stage, applications.filter((application) => application.stage === stage).length]),
  ) as Record<ApplicationStage, number>
  const visible = filter ? applications.filter((application) => application.stage === filter) : applications
  const handleExport = async () => {
    try {
      const { blob, fileName } = await exportToExcel.mutateAsync(jobId)
      saveBlob(blob, fileName)
      toast.success('Export ready', { description: fileName })
    } catch {
      toast.error('Unable to export candidates. Please try again.')
    }
  }

  const active = workflow ? (applications.find((application) => application.id === workflow.id) ?? null) : null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          Pipeline <span className="font-normal text-muted">({applications.length})</span>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {applications.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              loading={exportToExcel.isPending}
              title={`Download all ${applications.length} candidates as an Excel file`}
            >
              {!exportToExcel.isPending && <FileSpreadsheet />}
              Export to Excel
            </Button>
          )}
          {isOpen && (
            <ButtonLink to={`/candidates/new?jobId=${jobId}`} size="sm" variant="outline">
              <UserPlus />
              Add candidate
            </ButtonLink>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {applications.length > 0 && (
          <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-1.5">
            {(['', ...STAGES] as const).map((stage) => (
              <button
                key={stage || 'all'}
                type="button"
                aria-pressed={filter === stage}
                onClick={() => setFilter(stage)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filter === stage
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'text-muted hover:bg-surface-muted hover:text-foreground',
                )}
              >
                {stage ? stageLabels[stage] : 'All'}{' '}
                <span className="tabular-nums opacity-75">{stage ? counts[stage] : applications.length}</span>
              </button>
            ))}
          </div>
        )}

        {query.isError ? (
          <Alert>{getErrorMessage(query.error, 'Unable to load the pipeline.')}</Alert>
        ) : query.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : applications.length === 0 ? (
          <EmptyState
            icon={UserSquare2}
            title="No candidates yet"
            description={isOpen ? 'Add a candidate to start screening for this job.' : 'Open this job to accept candidates.'}
          />
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No candidates in this stage.</p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {visible.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                context="job"
                onAction={(app: Application, action) => setWorkflow({ id: app.id, action })}
              />
            ))}
          </div>
        )}
      </CardContent>
      <WorkflowDialog application={active} action={workflow?.action ?? null} onClose={() => setWorkflow(null)} />
    </Card>
  )
}
