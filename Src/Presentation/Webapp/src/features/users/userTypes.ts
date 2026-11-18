import type { PagedResult } from '@/features/companies/companyTypes'

export const ROLES = ['Admin', 'Recruiter', 'Vendor'] as const
export const STAFF_ROLES: RoleName[] = ['Admin', 'Recruiter']
export type RoleName = (typeof ROLES)[number]

export const roleDescriptions: Record<RoleName, string> = {
  Admin: 'Full access, including companies, job setup and user management.',
  Recruiter: 'Works on the jobs assigned to them.',
  Vendor: "Client contact who can only view their company's job postings. Can't be combined with other roles.",
}

export interface User {
  id: number
  email: string
  fullName: string
  roles: RoleName[]
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  companyId: number | null
  companyName: string | null
}

export interface UserFilters {
  search: string
  role: RoleName | ''
  status: 'active' | 'inactive' | ''
}

export interface CreateUserRequest {
  email: string
  fullName: string
  password: string
  roles: RoleName[]
  companyId: number | null
}

export interface UpdateUserRequest {
  email: string
  fullName: string
  roles: RoleName[]
  isActive: boolean
  companyId: number | null
}

export type UserPage = PagedResult<User>
