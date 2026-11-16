import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeOwnPassword, createUser, getUsers, resetUserPassword, updateUser } from './usersApi'
import type { CreateUserRequest, UpdateUserRequest, UserFilters } from './userTypes'

export function useUsers(filters: UserFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['users', filters, page, pageSize],
    queryFn: () => getUsers(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateUsers() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['recruiters'] }),
    ])
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: (request: CreateUserRequest) => createUser(request),
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateUserRequest }) => updateUser(id, request),
    onSuccess: invalidate,
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => resetUserPassword(id, newPassword),
  })
}

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changeOwnPassword(currentPassword, newPassword),
  })
}
