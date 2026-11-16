import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

export interface MultiSelectOption {
  value: number
  label: string
  group?: string
}

interface MultiSelectProps {
  /** Options that can be picked. Selected options are hidden from the list automatically. */
  options: MultiSelectOption[]
  value: MultiSelectOption[]
  onChange: (value: MultiSelectOption[]) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  loading?: boolean
  /** When set, typing a name that doesn't exist offers to create it. Resolve with the new option to select it. */
  onCreate?: (label: string) => Promise<MultiSelectOption | undefined>
  /** Text for the create row, e.g. (label) => `Add "${label}" to the library`. */
  createLabel?: (label: string) => string
  /** Label used for the chips' remove buttons, e.g. "skill". */
  itemNoun?: string
  // Wired by <Field>.
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

type Item = { kind: 'option'; option: MultiSelectOption } | { kind: 'create'; label: string }

/**
 * An accessible multi-select combobox (WAI-ARIA combobox + listbox pattern):
 * type to filter, arrow keys to move, Enter to pick, Backspace to remove the last chip, Escape to close.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No matches.',
  disabled,
  loading,
  onCreate,
  createLabel = (label) => `Add “${label}”`,
  itemNoun = 'item',
  id,
  ...aria
}: MultiSelectProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listboxId = `${inputId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [creating, setCreating] = useState(false)

  const selectedValues = useMemo(() => new Set(value.map((option) => option.value)), [value])
  const trimmed = query.trim().replace(/\s+/g, ' ')

  const items = useMemo<Item[]>(() => {
    const needle = trimmed.toLowerCase()
    const matches = options
      .filter((option) => !selectedValues.has(option.value))
      .filter((option) => !needle || option.label.toLowerCase().includes(needle))
      // Exact and prefix matches first, then keep the caller's (grouped) order.
      .map((option, index) => {
        const label = option.label.toLowerCase()
        const rank = label === needle ? 0 : label.startsWith(needle) ? 1 : 2
        return { option, rank, index }
      })
      .sort((a, b) => (needle ? a.rank - b.rank : 0) || a.index - b.index)
      .map(({ option }) => ({ kind: 'option' as const, option }))
    const exists =
      options.some((option) => option.label.toLowerCase() === needle) ||
      value.some((option) => option.label.toLowerCase() === needle)
    return onCreate && trimmed && !exists ? [...matches, { kind: 'create', label: trimmed }] : matches
  }, [options, selectedValues, trimmed, onCreate, value])

  const grouped = !trimmed && items.some((item) => item.kind === 'option' && item.option.group)
  const activeItem = open ? items[Math.min(activeIndex, items.length - 1)] : undefined
  const optionId = (index: number) => `${inputId}-option-${index}`

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)?.scrollIntoView?.({ block: 'nearest' })
    // optionId is derived from inputId, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open])

  const choose = async (item: Item) => {
    if (item.kind === 'option') {
      onChange([...value, item.option])
    } else if (onCreate) {
      setCreating(true)
      try {
        const created = await onCreate(item.label)
        if (created && !selectedValues.has(created.value)) onChange([...value, created])
      } finally {
        setCreating(false)
      }
    }
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  const remove = (option: MultiSelectOption) => {
    onChange(value.filter((selected) => selected.value !== option.value))
    inputRef.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) setOpen(true)
        else setActiveIndex((index) => Math.min(index + 1, items.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter':
        if (open && activeItem) {
          event.preventDefault()
          void choose(activeItem)
        }
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        }
        break
      case 'Backspace':
        if (!query && value.length > 0) remove(value[value.length - 1])
        break
    }
  }

  let lastGroup: string | undefined
  return (
    <div ref={rootRef} className="relative">
      <div
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            inputRef.current?.focus()
            setOpen(true)
          }
        }}
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-surface py-1 pr-9 pl-1.5 text-sm shadow-xs transition-colors',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20',
          aria['aria-invalid'] && 'border-danger focus-within:ring-danger/20',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {value.map((option) => (
          <span
            key={option.value}
            className="inline-flex items-center gap-1 rounded-md bg-primary-soft py-0.5 pr-1 pl-2 text-xs font-medium text-primary-soft-foreground"
          >
            {option.label}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(option)}
              aria-label={`Remove ${itemNoun} ${option.label}`}
              className="rounded p-0.5 hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeItem ? optionId(items.indexOf(activeItem)) : undefined}
          {...aria}
          disabled={disabled}
          value={query}
          placeholder={value.length ? '' : placeholder}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-7 min-w-24 flex-1 bg-transparent px-1.5 outline-none placeholder:text-muted/70"
        />
      </div>
      <span className="pointer-events-none absolute top-2.5 right-3 text-muted">
        {loading || creating ? <Spinner /> : <ChevronDown className="size-4" />}
      </span>

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-surface p-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-muted">Loading…</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{trimmed ? emptyMessage : 'Everything is already selected.'}</li>
          ) : (
            items.map((item, index) => {
              const header =
                grouped && item.kind === 'option' && item.option.group !== lastGroup ? item.option.group : undefined
              if (item.kind === 'option') lastGroup = item.option.group
              const active = activeItem === item
              return [
                header && (
                  <li
                    key={`group-${header}`}
                    role="presentation"
                    className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase"
                  >
                    {header}
                  </li>
                ),
                <li
                  key={item.kind === 'option' ? item.option.value : 'create'}
                  id={optionId(index)}
                  role="option"
                  aria-selected={false}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    void choose(item)
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                    active && 'bg-surface-muted',
                    item.kind === 'create' && 'text-primary',
                  )}
                >
                  {item.kind === 'option' ? (
                    <>
                      <Check aria-hidden className="size-4 opacity-0" />
                      {item.option.label}
                    </>
                  ) : (
                    <>
                      <Plus aria-hidden className="size-4" />
                      {createLabel(item.label)}
                    </>
                  )}
                </li>,
              ]
            })
          )}
        </ul>
      )}
    </div>
  )
}
