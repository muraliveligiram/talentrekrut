import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const storageKey = 'talrekrut.theme'
const listeners = new Set<() => void>()
const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && Boolean(media?.matches))
  document.documentElement.classList.toggle('dark', dark)
}

media?.addEventListener?.('change', () => {
  if (readTheme() === 'system') apply('system')
})

export function setTheme(theme: Theme) {
  try {
    if (theme === 'system') window.localStorage.removeItem(storageKey)
    else window.localStorage.setItem(storageKey, theme)
  } catch {
    // Storage may be unavailable (private mode); the theme still applies for this session.
  }
  apply(theme)
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    readTheme,
    () => 'system' as Theme,
  )
  return [theme, setTheme] as const
}
