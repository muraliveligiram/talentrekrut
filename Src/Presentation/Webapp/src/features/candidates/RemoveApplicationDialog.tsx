import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getErrorMessage } from '@/lib/api-error'
import type { Application } from './candidateTypes'
import { useRemoveApplication } from './useCandidates'

interface RemoveApplicationDialogProps {
  application: Application | null
  onClose: () => void
}

/** Admin-only: takes a candidate off one job's pipeline. The candidate profile and other jobs are kept. */
export function RemoveApplicationDialog({ application, onClose }: RemoveApplicationDialogProps) {
  const remove = useRemoveApplication()

  const confirm = async () => {
    if (!application) return
    try {
      await remove.mutateAsync(application.id)
      toast.success('Removed from job', {
        description: `${application.candidateName} · ${application.jobCode}`,
      })
      onClose()
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <ConfirmDialog
      open={application !== null}
      onOpenChange={(open) => {
        if (!open) {
          remove.reset()
          onClose()
        }
      }}
      title="Remove candidate from this job?"
      description={
        application
          ? `${application.candidateName} will be taken off ${application.jobCode} · ${application.jobTitle}, along with their progress and timeline for this job. Their profile and any other job applications are kept, and they can be submitted to this job again later.`
          : ''
      }
      confirmLabel="Remove from job"
      loading={remove.isPending}
      error={remove.isError ? getErrorMessage(remove.error, 'Unable to remove the candidate from this job.') : null}
      onConfirm={confirm}
    />
  )
}
