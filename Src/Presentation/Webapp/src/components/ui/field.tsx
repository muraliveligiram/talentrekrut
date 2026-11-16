import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  children: ReactElement<Record<string, unknown>>
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
}

/**
 * Labels a single form control and wires up id, aria-invalid and aria-describedby,
 * so validation messages are announced by screen readers.
 */
export function Field({ label, children, error, hint, required, className }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      {isValidElement(children) &&
        cloneElement(children, {
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy,
          'aria-required': required || undefined,
        })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
