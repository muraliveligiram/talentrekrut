import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignRecruiter,
  createJob,
  getJob,
  getJobs,
  getRecruiters,
  removeRecruiter,
  updateJob,
  updateJobStatus,
} from './jobsApi'
import type { JobStatus, JobWriteRequest } from './jobTypes'

export function useJobs(
  filters: { search: string; companyId: string; status: JobStatus | '' },
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ['jobs', filters, page, pageSize],
    queryFn: () => getJobs(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useJob(id: string, enabled = true) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => getJob(id),
    enabled,
  })
}

export function useRecruiters(enabled = true) {
  return useQuery({
    queryKey: ['recruiters'],
    queryFn: getRecruiters,
    enabled,
  })
}

export function useSaveJob(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: JobWriteRequest) => (id ? updateJob(id, request) : createJob(request)),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.setQueryData(['jobs', job.id], job)
    },
  })
}

export function useUpdateJobStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: JobStatus) => updateJobStatus(id, status),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.setQueryData(['jobs', job.id], job)
    },
  })
}

export function useAssignRecruiter(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recruiterId: number) => assignRecruiter(jobId, recruiterId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['jobs', jobId] }),
  })
}

export function useRemoveRecruiter(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recruiterId: number) => removeRecruiter(jobId, recruiterId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['jobs', jobId] }),
  })
}
