import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSkills, getSkillOptions, getSkills, updateSkill } from './skillsApi'
import type { SkillCategory, SkillFilters } from './skillTypes'

export function useSkills(filters: SkillFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['skills', 'page', filters, page, pageSize],
    queryFn: () => getSkills(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function useSkillOptions() {
  return useQuery({ queryKey: ['skills', 'options'], queryFn: getSkillOptions, staleTime: 5 * 60_000 })
}

export function useCreateSkills() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ names, category }: { names: string[]; category: SkillCategory }) => createSkills(names, category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills'] }),
  })
}

export function useUpdateSkill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...request }: { id: number; name: string; category: SkillCategory; isActive: boolean }) =>
      updateSkill(id, request),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['skills'] }),
        // Renames show up on job pages.
        queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      ]),
  })
}
