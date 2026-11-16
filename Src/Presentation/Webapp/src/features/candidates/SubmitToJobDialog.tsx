import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Select, Textarea } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/api-error'
import { useOpenJobs, useSubmitToJob } from './useCandidates'

interface SubmitToJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: number
  candidateName: string
  excludeJobIds: number[]
}

export function SubmitToJobDialog({ open, onOpenChange, candidateId, candidateName, excludeJobIds }: SubmitToJobDialogProps) {
  const jobsQuery = useOpenJobs(open)
  const submit = useSubmitToJob(candidateId)
  const [jobId, setJobId] = useState('')
  const [notes, setNotes] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const jobs = (jobsQuery.data ?? []).filter((job) => !excludeJobIds.includes(job.id))

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setJobId('')
      setNotes('')
      setFieldError(undefined)
      submit.reset()
    }
    onOpenChange(next)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!jobId) return setFieldError('Select a job.')
    try {
      const application = await submit.mutateAsync({ jobId: Number(jobId), notes })
      toast.success('Submitted for screening', { description: `${application.jobCode} · ${application.jobTitle}` })
      onOpenChange(false)
    } catch {
      // Rendered from mutation state.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent title="Submit to job" description={`Add ${candidateName} to an open job's pipeline.`}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {submit.isError && <Alert>{getErrorMessage(submit.error, 'Unable to submit the candidate.')}</Alert>}
          {jobsQuery.isError && <Alert>Unable to load open jobs.</Alert>}
          <Field
            label="Job"
            required
            error={fieldError}
            hint={!jobsQuery.isLoading && jobs.length === 0 ? 'There are no other open jobs available to you.' : undefined}
          >
            <Select value={jobId} onChange={(event) => setJobId(event.target.value)} disabled={jobsQuery.isLoading}>
              <option value="">{jobsQuery.isLoading ? 'Loading jobs…' : 'Select an open job…'}</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobCode} · {job.title} ({job.companyName})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" hint="Why this candidate fits. Shown in the timeline.">
            <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={submit.isPending}>
              Submit candidate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
