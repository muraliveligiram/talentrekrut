import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface Choice<T extends string> {
  value: T
  label: string
  description?: string
  icon?: LucideIcon
  tone?: 'positive' | 'negative'
}

interface ChoiceCardsProps<T extends string> {
  legend: string
  choices: Choice<T>[]
  value: T | null
  onChange: (value: T) => void
}

/** A radio group rendered as large, clickable cards for primary decisions. */
export function ChoiceCards<T extends string>({ legend, choices, value, onChange }: ChoiceCardsProps<T>) {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map(({ value: choice, label, description, icon: Icon, tone }) => {
          const checked = value === choice
          return (
            <label
              key={choice}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                checked && tone === 'negative' && 'border-danger/50 bg-danger-soft/50',
                checked && tone !== 'negative' && 'border-primary/50 bg-primary-soft/50',
                !checked && 'hover:bg-surface-muted/60',
              )}
            >
              <input
                type="radio"
                name={name}
                value={choice}
                checked={checked}
                onChange={() => onChange(choice)}
                className="sr-only"
              />
              {Icon && (
                <Icon
                  aria-hidden
                  className={cn('mt-0.5 size-4 shrink-0', tone === 'negative' ? 'text-danger' : 'text-primary')}
                />
              )}
              <span className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                {description && <span className="text-xs text-muted">{description}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
