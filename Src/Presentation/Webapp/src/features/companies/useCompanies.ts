import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getCompany,
  updateCompany,
} from './companiesApi'
import type { CompanyWriteRequest } from './companyTypes'

export function useCompanies(search: string, page: number, pageSize: number, enabled = true) {
  return useQuery({
    queryKey: ['companies', search, page, pageSize],
    queryFn: () => getCompanies(search, page, pageSize),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useCompany(id: string, enabled = true) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => getCompany(id),
    enabled,
  })
}

export function useSaveCompany(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CompanyWriteRequest) =>
      id ? updateCompany(id, request) : createCompany(request),
    onSuccess: async (company) => {
      await queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.setQueryData(['companies', company.id], company)
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })
}
