export const THEME_STORAGE_KEY = 'aurum:theme'

export type ThemeId = 'dark' | 'light' | 'graphite' | 'ocean' | 'sepia'

export interface ThemeDef {
  id: ThemeId
  /** Название для пользователя. */
  label: string
  /** Короткое пояснение. */
  hint: string
  /** Светлая ли тема (для color-scheme и снятия класса .dark). */
  light: boolean
  /** Цвета для превью-образца в переключателе: [фон, карточка, акцент]. */
  swatch: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  {
    id: 'dark',
    label: 'Тёмная',
    hint: 'Классическая тёмная гамма',
    light: false,
    swatch: ['oklch(0.16 0.012 265)', 'oklch(0.205 0.014 265)', 'oklch(0.585 0.214 24)'],
  },
  {
    id: 'light',
    label: 'Светлая',
    hint: 'Чистый светлый фон',
    light: true,
    swatch: ['oklch(0.985 0.003 250)', 'oklch(1 0 0)', 'oklch(0.54 0.21 25)'],
  },
  {
    id: 'graphite',
    label: 'Обычная',
    hint: 'Мягкий графитовый серый',
    light: false,
    swatch: ['oklch(0.27 0.006 255)', 'oklch(0.31 0.008 255)', 'oklch(0.6 0.2 25)'],
  },
  {
    id: 'ocean',
    label: 'Океан',
    hint: 'Глубокий тёмно-синий',
    light: false,
    swatch: ['oklch(0.19 0.035 252)', 'oklch(0.235 0.04 252)', 'oklch(0.7 0.13 200)'],
  },
  {
    id: 'sepia',
    label: 'Тёплая',
    hint: 'Кремовая, комфортна для глаз',
    light: true,
    swatch: ['oklch(0.945 0.022 85)', 'oklch(0.975 0.018 85)', 'oklch(0.52 0.16 38)'],
  },
]

export const DEFAULT_THEME: ThemeId = 'dark'

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === 'string' && THEMES.some((t) => t.id === value)
  )
}

export function isLightTheme(id: ThemeId): boolean {
  return THEMES.find((t) => t.id === id)?.light ?? false
}

/**
 * Применяет тему к <html>: data-theme, класс .dark (для dark:-вариантов)
 * и color-scheme. Используется и провайдером, и inline-скриптом анти-мигания.
 */
export function applyThemeToDocument(id: ThemeId): void {
  if (typeof document === 'undefined') return
  const light = isLightTheme(id)
  const el = document.documentElement
  el.setAttribute('data-theme', id)
  el.classList.toggle('dark', !light)
  el.style.colorScheme = light ? 'light' : 'dark'
}
