import { http } from '@/api/http'
import { fileNameFromDisposition } from '@/lib/download'
import type {
  Application,
  Candidate,
  CandidateFilters,
  CandidatePage,
  CandidateWriteRequest,
  RejectionReason,
} from './candidateTypes'

export async function getCandidates(filters: CandidateFilters, page: number, pageSize: number) {
  const response = await http.get<CandidatePage>('/candidates', {
    params: {
      search: filters.search || undefined,
      level: filters.level || undefined,
      stage: filters.stage || undefined,
      page,
      pageSize,
    },
  })
  return response.data
}

export async function getCandidate(id: string) {
  return (await http.get<Candidate>(`/candidates/${id}`)).data
}

export async function createCandidate(request: CandidateWriteRequest & { jobId: number | null }) {
  return (await http.post<Candidate>('/candidates', request)).data
}

export async function updateCandidate(id: string, request: CandidateWriteRequest) {
  return (await http.put<Candidate>(`/candidates/${id}`, request)).data
}

export async function deleteCandidate(id: number) {
  await http.delete(`/candidates/${id}`)
}

export async function submitToJob(candidateId: number, jobId: number, notes: string) {
  return (await http.post<Application>(`/candidates/${candidateId}/applications`, { jobId, notes: notes || null })).data
}

export async function getJobApplications(jobId: string) {
  return (await http.get<Application[]>(`/jobs/${jobId}/applications`)).data
}

export async function screenApplication(
  id: number,
  request: { shortlisted: boolean; rejectionReasons: RejectionReason[]; notes: string | null },
) {
  return (await http.post<Application>(`/applications/${id}/screening`, request)).data
}

export async function scheduleInterview(id: number, request: { scheduledAt: string; notes: string | null }) {
  return (await http.post<Application>(`/applications/${id}/interview`, request)).data
}

export async function recordOutcome(
  id: number,
  request: { selected: boolean; rejectionReasons: RejectionReason[]; notes: string | null },
) {
  return (await http.post<Application>(`/applications/${id}/outcome`, request)).data
}

export async function getPipelineStats(from: Date, to: Date) {
  const response = await http.get<{ activeCandidates: number; interviewsInRange: number }>('/applications/stats', {
    params: { from: from.toISOString(), to: to.toISOString() },
  })
  return response.data
}

/** Downloads every candidate on a job as an Excel workbook, with times in the browser's time zone. */
export async function exportJobApplications(jobId: string) {
  const response = await http.get<Blob>(`/jobs/${jobId}/applications/export`, {
    params: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    responseType: 'blob',
  })
  const fileName = fileNameFromDisposition(response.headers['content-disposition'], `job-${jobId}-candidates.xlsx`)
  return { blob: response.data, fileName }
}

export interface SubmissionOutcomes {
  submitted: number
  inProgress: number
  notShortlisted: number
  selected: number
  rejected: number
}

export interface RecruiterActivity {
  userId: number
  name: string
  processed: number
  submitted: number
  shortlisted: number
  notShortlisted: number
  selected: number
  rejected: number
}

export interface PipelineInsights {
  days: number
  from: string
  to: string
  selectedCount: number
  outcomes: SubmissionOutcomes
  recruiters: RecruiterActivity[]
}

export async function getPipelineInsights(days: number) {
  return (await http.get<PipelineInsights>('/applications/insights', { params: { days } })).data
}
