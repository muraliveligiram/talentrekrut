import type { PagedResult } from '../companies/companyTypes'

export type EmploymentType = 'FullTime' | 'PartTime' | 'Contract' | 'Temporary' | 'Internship'
export type WorkMode = 'Onsite' | 'Remote' | 'Hybrid'
export type JobStatus = 'Draft' | 'Open' | 'OnHold' | 'Closed'
export type JobSkillType = 'Primary' | 'Secondary' | 'GoodToHave'

export interface JobSkill {
  id: number
  skillName: string
  skillType: JobSkillType
  minYears: number | null
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
  assignments: JobAssignment[]
  createdAt: string
}

export interface JobSkillWriteRequest {
  skillName: string
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
}

export interface Recruiter {
  id: number
  fullName: string
  email: string
}

export type JobPage = PagedResult<Job>
