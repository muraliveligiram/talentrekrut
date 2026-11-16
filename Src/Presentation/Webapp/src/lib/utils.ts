import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatDate(value: string | null | undefined) {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

export function formatRelative(value: string | null | undefined, now = Date.now()) {
  if (!value) return 'Never'
  const seconds = Math.round((new Date(value).getTime() - now) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit)
  }
  return 'Just now'
}

/** Splits PascalCase enum values for display, e.g. "OnHold" -> "On hold". */
export function humanize(value: string) {
  const spaced = value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
