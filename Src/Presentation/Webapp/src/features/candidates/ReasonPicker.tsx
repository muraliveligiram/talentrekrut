import { Checkbox } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ReasonPickerProps<T extends string> {
  /** All selectable reasons, in display order. */
  options: readonly T[]
  labels: Record<T, string>
  value: T[]
  onChange: (value: T[]) => void
  legend: string
  required?: boolean
  error?: string
}

export function ReasonPicker<T extends string>({ options, labels, value, onChange, legend, required, error }: ReasonPickerProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        {legend}
        {required && <span aria-hidden className="ml-0.5 text-danger">*</span>}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((reason) => {
          const checked = value.includes(reason)
          return (
            <label
              key={reason}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                checked ? 'border-danger/40 bg-danger-soft/50' : 'hover:bg-surface-muted/60',
              )}
            >
              <Checkbox
                checked={checked}
                onChange={(event) =>
                  onChange(event.target.checked ? [...value, reason] : value.filter((item) => item !== reason))
                }
              />
              {labels[reason]}
            </label>
          )
        })}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </fieldset>
  )
}
