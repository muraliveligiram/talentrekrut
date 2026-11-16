import { http } from '../../api/http'
import type { Job, JobPage, JobStatus, JobWriteRequest, Recruiter } from './jobTypes'

export async function getJobs(
  filters: { search: string; companyId: string; status: JobStatus | '' },
  page: number,
  pageSize: number,
) {
  const response = await http.get<JobPage>('/jobs', {
    params: {
      search: filters.search || undefined,
      companyId: filters.companyId || undefined,
      status: filters.status || undefined,
      page,
      pageSize,
    },
  })
  return response.data
}

export async function getJob(id: string) {
  const response = await http.get<Job>(`/jobs/${id}`)
  return response.data
}

export async function createJob(request: JobWriteRequest) {
  const response = await http.post<Job>('/jobs', request)
  return response.data
}

export async function updateJob(id: string, request: JobWriteRequest) {
  const response = await http.put<Job>(`/jobs/${id}`, request)
  return response.data
}

export async function updateJobStatus(id: string, status: JobStatus) {
  const response = await http.patch<Job>(`/jobs/${id}/status`, { status })
  return response.data
}

export async function getRecruiters() {
  const response = await http.get<Recruiter[]>('/users/recruiters')
  return response.data
}

export async function assignRecruiter(jobId: string, recruiterUserId: number) {
  await http.post(`/jobs/${jobId}/assignments`, { recruiterUserId })
}

export async function removeRecruiter(jobId: string, recruiterUserId: number) {
  await http.delete(`/jobs/${jobId}/assignments/${recruiterUserId}`)
}
