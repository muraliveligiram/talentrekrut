import type { PagedResult } from '@/features/companies/companyTypes'

export const SKILL_CATEGORIES = [
  'ProgrammingLanguage',
  'Framework',
  'Database',
  'CloudDevOps',
  'Testing',
  'Tool',
  'Methodology',
  'SoftSkill',
  'Other',
] as const
export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

export const categoryLabels: Record<SkillCategory, string> = {
  ProgrammingLanguage: 'Programming language',
  Framework: 'Framework',
  Database: 'Database',
  CloudDevOps: 'Cloud & DevOps',
  Testing: 'Testing',
  Tool: 'Tool',
  Methodology: 'Methodology',
  SoftSkill: 'Soft skill',
  Other: 'Other',
}

export interface Skill {
  id: number
  name: string
  category: SkillCategory
  isActive: boolean
  jobCount: number
  createdAt: string
}

export interface SkillOption {
  id: number
  name: string
  category: SkillCategory
}

export interface SkillFilters {
  search: string
  category: SkillCategory | ''
  status: 'active' | 'inactive' | ''
}

export interface CreateSkillsResult {
  created: Skill[]
  existing: Skill[]
}

export type SkillPage = PagedResult<Skill>

/** Splits free text into skill names on commas, semicolons and new lines. */
export function parseSkillNames(text: string) {
  const seen = new Set<string>()
  return text
    .split(/[,;\n]/)
    .map((name) => name.trim().replace(/\s+/g, ' '))
    .filter((name) => {
      const key = name.toUpperCase()
      if (!name || seen.has(key)) return false
      seen.add(key)
      return true
    })
}
