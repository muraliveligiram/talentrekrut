import type { BadgeTone } from '@/components/ui/badge'
import type { PagedResult } from '@/features/companies/companyTypes'

export const LEVELS = ['Entry', 'Junior', 'MidLevel', 'Senior', 'Lead', 'Architect', 'Manager', 'Director'] as const
export type CandidateLevel = (typeof LEVELS)[number]

export const STAGES = ['Screening', 'Shortlisted', 'NotShortlisted', 'InterviewScheduled', 'Selected', 'Rejected'] as const
export type ApplicationStage = (typeof STAGES)[number]

export const REJECTION_REASONS = [
  'SkillMismatch',
  'InsufficientExperience',
  'CommunicationSkills',
  'CtcExpectationTooHigh',
  'NoticePeriodTooLong',
  'CulturalFit',
  'DidNotAttendInterview',
  'PositionFilled',
  'Other',
] as const
export type RejectionReason = (typeof REJECTION_REASONS)[number]

export const levelLabels: Record<CandidateLevel, string> = {
  Entry: 'Entry level',
  Junior: 'Junior',
  MidLevel: 'Mid-level',
  Senior: 'Senior',
  Lead: 'Lead',
  Architect: 'Architect',
  Manager: 'Manager',
  Director: 'Director',
}

export const stageLabels: Record<ApplicationStage, string> = {
  Screening: 'Screening',
  Shortlisted: 'Shortlisted',
  NotShortlisted: 'Not shortlisted',
  InterviewScheduled: 'Interview scheduled',
  Selected: 'Selected',
  Rejected: 'Rejected',
}

export const stageTone: Record<ApplicationStage, BadgeTone> = {
  Screening: 'neutral',
  Shortlisted: 'primary',
  NotShortlisted: 'danger',
  InterviewScheduled: 'warning',
  Selected: 'success',
  Rejected: 'danger',
}

export const rejectionReasonLabels: Record<RejectionReason, string> = {
  SkillMismatch: 'Skill mismatch',
  InsufficientExperience: 'Insufficient experience',
  CommunicationSkills: 'Communication skills',
  CtcExpectationTooHigh: 'CTC expectation too high',
  NoticePeriodTooLong: 'Notice period too long',
  CulturalFit: 'Cultural fit',
  DidNotAttendInterview: 'Did not attend interview',
  PositionFilled: 'Position already filled',
  Other: 'Other',
}

export const NOTICE_PERIODS = [0, 15, 30, 45, 60, 90, 120] as const

export function noticeLabel(days: number) {
  return days === 0 ? 'Immediate' : `${days} days`
}

export function formatLpa(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} LPA`
}

export interface StageChange {
  id: number
  fromStage: ApplicationStage | null
  toStage: ApplicationStage
  changedAt: string
  changedByName: string
  interviewScheduledAt: string | null
  notes: string | null
}

export interface Application {
  id: number
  candidateId: number
  candidateName: string
  candidateRole: string
  /** Hidden (null) for vendors. */
  candidateCompany: string | null
  candidateLevel: CandidateLevel
  jobId: number
  jobCode: string
  jobTitle: string
  companyName: string
  stage: ApplicationStage
  submittedAt: string
  submittedByName: string
  interviewScheduledAt: string | null
  rejectionReasons: RejectionReason[]
  rejectionNotes: string | null
  history: StageChange[]
}

export interface CandidateSummary {
  id: number
  fullName: string
  currentRole: string
  currentCompany: string
  level: CandidateLevel
  phone: string
  personalEmail: string
  currentCtcLpa: number
  expectedCtcLpa: number
  noticePeriodDays: number
  applicationCount: number
  latestStage: ApplicationStage | null
  createdAt: string
}

export interface Candidate {
  id: number
  fullName: string
  currentRole: string
  currentCompany: string
  level: CandidateLevel
  dateOfBirth: string
  phone: string
  personalEmail: string
  companyEmail: string | null
  currentCtcLpa: number
  currentCtcIncludesVariable: boolean
  variablePayLpa: number | null
  expectedCtcLpa: number
  noticePeriodDays: number
  linkedInUrl: string | null
  notes: string | null
  sourcedByUserId: number
  sourcedByName: string
  createdAt: string
  applications: Application[]
}

export interface CandidateWriteRequest {
  fullName: string
  currentRole: string
  currentCompany: string
  level: CandidateLevel
  dateOfBirth: string
  phone: string
  personalEmail: string
  companyEmail: string | null
  currentCtcLpa: number
  currentCtcIncludesVariable: boolean
  variablePayLpa: number | null
  expectedCtcLpa: number
  noticePeriodDays: number
  linkedInUrl: string | null
  notes: string | null
}

export interface CandidateFilters {
  search: string
  level: CandidateLevel | ''
  stage: ApplicationStage | ''
}

export type CandidatePage = PagedResult<CandidateSummary>
