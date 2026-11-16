import { http } from '@/api/http'
import type { CreateSkillsResult, Skill, SkillCategory, SkillFilters, SkillOption, SkillPage } from './skillTypes'

export async function getSkills(filters: SkillFilters, page: number, pageSize: number) {
  const response = await http.get<SkillPage>('/skills', {
    params: {
      search: filters.search || undefined,
      category: filters.category || undefined,
      isActive: filters.status === '' ? undefined : filters.status === 'active',
      page,
      pageSize,
    },
  })
  return response.data
}

export async function getSkillOptions() {
  return (await http.get<SkillOption[]>('/skills/options')).data
}

export async function createSkills(names: string[], category: SkillCategory) {
  return (await http.post<CreateSkillsResult>('/skills', { names, category })).data
}

export async function updateSkill(id: number, request: { name: string; category: SkillCategory; isActive: boolean }) {
  return (await http.put<Skill>(`/skills/${id}`, request)).data
}
