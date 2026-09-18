import {
  BarChart3,
  BookText,
  Bot,
  Brain,
  Calculator,
  CreditCard,
  Globe,
  Home,
  KeyRound,
  Mail,
  NotebookPen,
  Search,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react"

/** Идентификаторы всех разделов CRM. */
export type TabId =
  | "home"
  | "cashbox"
  | "balance"
  | "statistics"
  | "analytics"
  | "calculator"
  | "notepad"
  | "tools"
  | "sites"
  | "bots"
  | "contacts"
  | "emails"
  | "employees"
  | "notebook"
  | "vault"
  | "prompts"

export type TabDef = {
  id: TabId
  label: string
  icon: typeof Wallet
  /** Короткое описание для плиток навигации на главной. */
  hint?: string
}

export const HOME_TAB: TabDef = {
  id: "home",
  label: "Главная",
  icon: Home,
  hint: "Сводка продаж и состояние системы",
}

// Разделы сгруппированы по смыслу — единый источник для шапки и главной.
export const TAB_GROUPS: { group: string; tabs: TabDef[] }[] = [
  {
    group: "Финансы и аналитика",
    tabs: [
      { id: "balance", label: "Баланс", icon: Wallet, hint: "Учёт прихода, расхода и прибыли по дням" },
      { id: "statistics", label: "Статистика", icon: BarChart3, hint: "Показатели за периоды" },
      { id: "analytics", label: "Аналитика", icon: Brain, hint: "Тренды и выводы" },
      { id: "calculator", label: "Калькулятор", icon: Calculator, hint: "Быстрые расчёты" },
    ],
  },
  {
    group: "Тексты и заметки",
    tabs: [
      { id: "notebook", label: "WORD AI", icon: BookText, hint: "Редактор документов" },
      { id: "notepad", label: "Блокнот", icon: NotebookPen, hint: "Заметки" },
      { id: "prompts", label: "Промты", icon: Sparkles, hint: "Библиотека промтов" },
    ],
  },
  {
    group: "Маркетинг и ресурсы",
    tabs: [
      { id: "tools", label: "Поисковые инструменты", icon: Search, hint: "Инструменты поиска" },
      { id: "sites", label: "Сайты", icon: Globe, hint: "Рекламные и прочие сайты" },
      { id: "bots", label: "Боты", icon: Bot, hint: "Телеграм-боты и сервисы" },
    ],
  },
  {
    group: "Доступы и команда",
    tabs: [
      { id: "vault", label: "Пароли", icon: KeyRound, hint: "Хранилище паролей" },
      { id: "contacts", label: "Номера/Карты", icon: CreditCard, hint: "Контакты и карты" },
      { id: "emails", label: "Почты", icon: Mail, hint: "Почтовые ящики" },
      { id: "employees", label: "Сотрудники/Доступы", icon: Users, hint: "Команда и доступы" },
    ],
  },
]

/** Плоский список всех разделов (без главной). */
export const ALL_TABS: TabDef[] = TAB_GROUPS.flatMap((g) => g.tabs)
