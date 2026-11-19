import type { BadgeTone } from '@/components/ui/badge'
import type { PagedResult } from '@/features/companies/companyTypes'
import type { JobStatus } from '@/features/jobs/jobTypes'

export const LEVELS = ['Entry', 'Junior', 'MidLevel', 'Senior', 'Lead', 'Architect', 'Manager', 'Director'] as const
export type CandidateLevel = (typeof LEVELS)[number]

export const STAGES = [
  'Screening',
  'Shortlisted',
  'NotShortlisted',
  'InterviewScheduled',
  'RoundCleared',
  'Selected',
  'Rejected',
  'Joined',
  'NotJoined',
] as const
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

/** Stages before a candidate is shortlisted (still screening, or screened out). */
export const PRE_SHORTLIST_STAGES: readonly ApplicationStage[] = ['Screening', 'NotShortlisted']

/** Stages after a candidate is selected (awaiting joining, joined, or did not join). */
export const POST_SELECTION_STAGES: readonly ApplicationStage[] = ['Selected', 'Joined', 'NotJoined']

/** Stages with a next workflow action; the rest are final. */
export const ACTIONABLE_STAGES: readonly ApplicationStage[] = [
  'Screening',
  'Shortlisted',
  'RoundCleared',
  'InterviewScheduled',
  'Selected',
]

export const stageLabels: Record<ApplicationStage, string> = {
  Screening: 'Screening',
  Shortlisted: 'Shortlisted',
  NotShortlisted: 'Not shortlisted',
  InterviewScheduled: 'Interview scheduled',
  RoundCleared: 'Round cleared',
  Selected: 'Selected',
  Rejected: 'Rejected',
  Joined: 'Joined',
  NotJoined: 'Did not join',
}

export const stageTone: Record<ApplicationStage, BadgeTone> = {
  Screening: 'neutral',
  Shortlisted: 'primary',
  NotShortlisted: 'danger',
  InterviewScheduled: 'warning',
  RoundCleared: 'primary',
  Selected: 'success',
  Rejected: 'danger',
  Joined: 'success',
  NotJoined: 'danger',
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

export const NOT_JOINING_REASONS = [
  'AcceptedAnotherOffer',
  'CounterOfferFromCurrentEmployer',
  'CompensationMismatch',
  'RelocationIssues',
  'PersonalReasons',
  'HealthReasons',
  'NoResponse',
  'OfferWithdrawn',
  'Other',
] as const
export type NotJoiningReason = (typeof NOT_JOINING_REASONS)[number]

export const notJoiningReasonLabels: Record<NotJoiningReason, string> = {
  AcceptedAnotherOffer: 'Accepted another offer',
  CounterOfferFromCurrentEmployer: 'Counter-offer from current employer',
  CompensationMismatch: 'Compensation mismatch',
  RelocationIssues: 'Relocation issues',
  PersonalReasons: 'Personal reasons',
  HealthReasons: 'Health reasons',
  NoResponse: 'No response / absconded',
  OfferWithdrawn: 'Offer withdrawn',
  Other: 'Other',
}

export type RoundStatus = 'Upcoming' | 'Scheduled' | 'Cleared' | 'NotCleared'

export interface RoundProgress {
  sequence: number
  name: string
  status: RoundStatus
  scheduledAt: string | null
  decidedAt: string | null
}

/** The round to act on next: the scheduled one, else the first upcoming one. */
export function activeRound(rounds: RoundProgress[]) {
  return rounds.find((round) => round.status === 'Scheduled') ?? rounds.find((round) => round.status === 'Upcoming')
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
  roundName: string | null
  joiningDate: string | null
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
  jobStatus: JobStatus
  stage: ApplicationStage
  submittedAt: string
  submittedByName: string
  interviewScheduledAt: string | null
  rejectionReasons: RejectionReason[]
  rejectionNotes: string | null
  history: StageChange[]
  rounds: RoundProgress[]
  joiningDate: string | null
  notJoiningReasons: NotJoiningReason[]
  /** Hidden (null) for vendors. */
  notJoiningNotes: string | null
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
