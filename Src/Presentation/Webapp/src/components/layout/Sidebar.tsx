import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import { navigation } from './navigation'

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        T
      </span>
      <span className="text-[15px] font-semibold tracking-tight">Talent Pool</span>
    </div>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { roles } = useAuth()

  return (
    <nav aria-label="Main" className="flex flex-col gap-6 px-3 py-4">
      {navigation.map((section, index) => {
        const items = section.items.filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)))
        if (items.length === 0) return null
        return (
          <div key={section.title ?? index} className="flex flex-col gap-1">
            {section.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{section.title}</p>
            )}
            {items.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary-soft-foreground'
                      : 'text-muted hover:bg-surface-muted hover:text-foreground',
                  )
                }
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        )
      })}
    </nav>
  )
}
