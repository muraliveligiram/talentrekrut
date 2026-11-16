import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  eyebrow?: ReactNode
}

export function PageHeader({ title, description, actions, back, eyebrow }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      {back && (
        <Link
          to={back.to}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow && <div className="text-xs font-medium tracking-wide text-muted uppercase">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {description && <div className="text-sm text-muted">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
