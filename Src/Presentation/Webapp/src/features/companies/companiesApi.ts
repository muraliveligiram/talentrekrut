import { http } from '../../api/http'
import type { Company, CompanyWriteRequest, PagedResult } from './companyTypes'

export async function getCompanies(search: string, page: number, pageSize: number) {
  const response = await http.get<PagedResult<Company>>('/companies', {
    params: { search: search || undefined, page, pageSize },
  })
  return response.data
}

export async function getCompany(id: string) {
  const response = await http.get<Company>(`/companies/${id}`)
  return response.data
}

export async function createCompany(request: CompanyWriteRequest) {
  const response = await http.post<Company>('/companies', request)
  return response.data
}

export async function updateCompany(id: string, request: CompanyWriteRequest) {
  const response = await http.put<Company>(`/companies/${id}`, request)
  return response.data
}

export async function deleteCompany(id: number) {
  await http.delete(`/companies/${id}`)
}
