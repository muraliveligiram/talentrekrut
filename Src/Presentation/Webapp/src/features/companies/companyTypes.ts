export interface Company {
  id: number
  name: string
  industry: string | null
  website: string | null
  about: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  contactPersonName: string | null
  contactEmail: string | null
  contactPhone: string | null
  logoPath: string | null
  isActive: boolean
  createdAt: string
}

export interface CompanyWriteRequest {
  name: string
  industry?: string
  website?: string
  about?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  contactPersonName?: string
  contactEmail?: string
  contactPhone?: string
  logoPath?: string
  isActive: boolean
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}
