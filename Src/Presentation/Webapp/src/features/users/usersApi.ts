import { http } from '@/api/http'
import type { CreateUserRequest, UpdateUserRequest, User, UserFilters, UserPage } from './userTypes'

export async function getUsers(filters: UserFilters, page: number, pageSize: number) {
  const response = await http.get<UserPage>('/users', {
    params: {
      search: filters.search || undefined,
      role: filters.role || undefined,
      isActive: filters.status === '' ? undefined : filters.status === 'active',
      page,
      pageSize,
    },
  })
  return response.data
}

export async function createUser(request: CreateUserRequest) {
  const response = await http.post<User>('/users', request)
  return response.data
}

export async function updateUser(id: number, request: UpdateUserRequest) {
  const response = await http.put<User>(`/users/${id}`, request)
  return response.data
}

export async function resetUserPassword(id: number, newPassword: string) {
  await http.post(`/users/${id}/reset-password`, { newPassword })
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  await http.post('/auth/change-password', { currentPassword, newPassword })
}
