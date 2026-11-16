import type { PagedResult } from '@/features/companies/companyTypes'

export const ROLES = ['Admin', 'Recruiter'] as const
export type RoleName = (typeof ROLES)[number]

export const roleDescriptions: Record<RoleName, string> = {
  Admin: 'Full access, including companies, job setup and user management.',
  Recruiter: 'Works on the jobs assigned to them.',
}

export interface User {
  id: number
  email: string
  fullName: string
  roles: RoleName[]
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
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
}

export interface UpdateUserRequest {
  email: string
  fullName: string
  roles: RoleName[]
  isActive: boolean
}

export type UserPage = PagedResult<User>
