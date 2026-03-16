import { useState, useEffect, createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'codara-theme'

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* ignore */ }
  return 'dark'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch { /* ignore */ }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle }
}

// ─── Context (so any nested component can read the current theme) ─────────────

export const ThemeContext = createContext<Theme>(
  (() => {
    try {
      const stored = localStorage.getItem('codara-theme')
      if (stored === 'light') return 'light' as Theme
    } catch { /* ignore */ }
    return 'dark' as Theme
  })()
)

export function useCurrentTheme(): Theme {
  return useContext(ThemeContext)
}
