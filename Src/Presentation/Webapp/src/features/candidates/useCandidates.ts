import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getJobs } from '@/features/jobs/jobsApi'
import * as api from './candidatesApi'
import type { CandidateFilters, CandidateWriteRequest, RejectionReason } from './candidateTypes'

export function useCandidates(filters: CandidateFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['candidates', filters, page, pageSize],
    queryFn: () => api.getCandidates(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useCandidate(id: string, enabled = true) {
  return useQuery({ queryKey: ['candidates', id], queryFn: () => api.getCandidate(id), enabled })
}

export function useJobApplications(jobId: string) {
  return useQuery({ queryKey: ['applications', 'job', jobId], queryFn: () => api.getJobApplications(jobId) })
}

/** Workflow changes affect candidate pages, job pipelines and dashboard counts. */
function useInvalidatePipeline() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['candidates'] }),
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
    ])
}

export function useSaveCandidate(id?: string) {
  const invalidate = useInvalidatePipeline()
  return useMutation({
    mutationFn: (request: CandidateWriteRequest & { jobId: number | null }) =>
      id ? api.updateCandidate(id, request) : api.createCandidate(request),
    onSuccess: invalidate,
  })
}

export function useDeleteCandidate() {
  const invalidate = useInvalidatePipeline()
  return useMutation({ mutationFn: api.deleteCandidate, onSuccess: invalidate })
}

export function useSubmitToJob(candidateId: number) {
  const invalidate = useInvalidatePipeline()
  return useMutation({
    mutationFn: ({ jobId, notes }: { jobId: number; notes: string }) => api.submitToJob(candidateId, jobId, notes),
    onSuccess: invalidate,
  })
}

export function useRemoveApplication() {
  const invalidate = useInvalidatePipeline()
  return useMutation({ mutationFn: (id: number) => api.removeApplication(id), onSuccess: invalidate })
}

export function useScreenApplication() {
  const invalidate = useInvalidatePipeline()
  return useMutation({
    mutationFn: ({ id, ...request }: { id: number; shortlisted: boolean; rejectionReasons: RejectionReason[]; notes: string | null }) =>
      api.screenApplication(id, request),
    onSuccess: invalidate,
  })
}

export function useScheduleInterview() {
  const invalidate = useInvalidatePipeline()
  return useMutation({
    mutationFn: ({ id, ...request }: { id: number; scheduledAt: string; notes: string | null }) =>
      api.scheduleInterview(id, request),
    onSuccess: invalidate,
  })
}

export function useRecordOutcome() {
  const invalidate = useInvalidatePipeline()
  return useMutation({
    mutationFn: ({ id, ...request }: { id: number; selected: boolean; rejectionReasons: RejectionReason[]; notes: string | null }) =>
      api.recordOutcome(id, request),
    onSuccess: invalidate,
  })
}

/** Open jobs the current user can submit to (recruiters only see their assigned jobs). */
export function useOpenJobs(enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'open-options'],
    queryFn: async () => (await getJobs({ search: '', companyId: '', status: 'Open' }, 1, 100)).items,
    enabled,
  })
}


export function useExportJobApplications() {
  return useMutation({ mutationFn: (jobId: string) => api.exportJobApplications(jobId) })
}
