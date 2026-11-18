import { Briefcase, Building2, LayoutDashboard, Tags, Users, UserSquare2, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  roles?: string[]
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Recruitment',
    items: [
      { label: 'Jobs', to: '/jobs', icon: Briefcase },
      { label: 'Candidates', to: '/candidates', icon: UserSquare2, roles: ['Admin', 'Recruiter'] },
      { label: 'Companies', to: '/companies', icon: Building2, roles: ['Admin'] },
      { label: 'Skill library', to: '/skills', icon: Tags, roles: ['Admin', 'Recruiter'] },
    ],
  },
  {
    title: 'Administration',
    items: [{ label: 'Users', to: '/users', icon: Users, roles: ['Admin'] }],
  },
]
