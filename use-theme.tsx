'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  applyThemeToDocument,
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  type ThemeId,
} from '@/lib/themes'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)

  // Считываем сохранённую тему пользователя при монтировании.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (isThemeId(stored)) {
        setThemeState(stored)
        applyThemeToDocument(stored)
      }
    } catch {
      /* localStorage недоступен — остаёмся на теме по умолчанию */
    }
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    applyThemeToDocument(id)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id)
    } catch {
      /* игнорируем ошибки записи */
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
