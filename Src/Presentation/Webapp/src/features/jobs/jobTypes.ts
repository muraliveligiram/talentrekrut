import type { PagedResult } from '../companies/companyTypes'
import type { SkillCategory } from '../skills/skillTypes'

export type EmploymentType = 'FullTime' | 'PartTime' | 'Contract' | 'Temporary' | 'Internship'
export type WorkMode = 'Onsite' | 'Remote' | 'Hybrid'
export type JobStatus = 'Draft' | 'Open' | 'OnHold' | 'Closed'
export type JobSkillType = 'Primary' | 'Secondary' | 'GoodToHave'

export interface JobSkill {
  id: number
  skillId: number
  skillName: string
  category: SkillCategory
  skillType: JobSkillType
  minYears: number | null
}

export interface InterviewRound {
  id: number
  sequence: number
  name: string
}

export interface JobAssignment {
  recruiterUserId: number
  recruiterName: string
  assignedAt: string
  isActive: boolean
}

export interface Job {
  id: number
  jobCode: string
  companyId: number
  companyName: string
  title: string
  description: string | null
  minExperienceYears: number
  maxExperienceYears: number
  openings: number
  location: string | null
  employmentType: EmploymentType
  workMode: WorkMode
  communicationRequirement: string | null
  status: JobStatus
  skills: JobSkill[]
  interviewRounds: InterviewRound[]
  assignments: JobAssignment[]
  createdAt: string
  /** Candidates submitted to this job. */
  candidateCount: number
}

export interface JobSkillWriteRequest {
  skillId: number
  skillType: JobSkillType
  minYears: number | null
}

export interface JobWriteRequest {
  companyId: number
  title: string
  description?: string
  minExperienceYears: number
  maxExperienceYears: number
  openings: number
  location?: string
  employmentType: EmploymentType
  workMode: WorkMode
  communicationRequirement?: string
  skills: JobSkillWriteRequest[]
  interviewRounds: string[]
}

export interface Recruiter {
  id: number
  fullName: string
  email: string
}

export type JobPage = PagedResult<Job>
