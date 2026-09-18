// ====== Доменные типы приложения AURUM ======

export const AD_CAMPAIGNS = [
  { key: 'hollandia', label: 'hollandia', index: 1 },
  { key: 'riagroup', label: 'riagroup', index: 2 },
  { key: 'parav0aspekt', label: 'parav0aspekt', index: 3 },
  { key: 'tahirhusnutdinoff', label: 'tahirhusnutdinoff', index: 4 },
  { key: 'timuriskarinov', label: 'timuriskarinov', index: 5 },
] as const

export type AdCampaignKey = (typeof AD_CAMPAIGNS)[number]['key']

/** Названия касс, доступные для выбора при добавлении рекламного сайта. */
export const CASHIERS = ['Platega', 'Cashera'] as const
export type CashierName = (typeof CASHIERS)[number]

export interface OtherExpenseItem {
  id: string
  amount: number
  note: string
}

/** Данные, которые ВВОДИТ пользователь за рабочий день. */
export interface DayInput {
  baseRequestsCount: number // кол-во базовых заявок
  otherIncome: number // иные поступления (не по кассе)
  paidUnrealizedCount: number // «Опл. нереал» — КОЛИЧЕСТВО оплаченных нереализованных заявок (по 1999 ₽)
  refundsCount: number // кол-во заявок с возвратом
  refundsSum: number // общая сумма возвратов
  ads: Record<AdCampaignKey, number> // расходы по 5 рекламным компаниям
  salaries: number // зарплата сотрудников
  otherExpenses: OtherExpenseItem[] // прочие расходы (сумма + пояснение)
}

/** Запись одного дня в таблице "Баланс". */
export interface DayRecord {
  date: string // ISO 'YYYY-MM-DD'
  input: DayInput
  submitted: boolean // нажата ли кнопка "Загрузить данные"
  updatedAt: number
}

/** Полностью рассчитанные показатели одного дня. */
export interface DayComputed {
  date: string
  // Приход
  baseRequestsCount: number
  baseRequestsSum: number
  otherIncome: number
  paidUnrealizedCount: number // «Опл. нереал» — кол-во заявок
  paidUnrealizedSum: number // «Опл. нереал» — общая сумма (кол-во × 1999), учитывается в доходе
  refundsCount: number
  refundsSum: number
  totalIncome: number // итоговая сумма прихода
  // Расход
  cashCommission: number
  adsTotal: number
  adsBreakdown: Record<AdCampaignKey, number>
  salaries: number
  ropSalary: number // «ЗП РОП» — рассчитывается автоматически
  otherExpensesTotal: number
  totalExpenses: number
  // Результат
  netProfit: number
  margin: number // рентабельность, %
  submitted: boolean
}

export interface PeriodTotals {
  baseRequestsCount: number
  baseRequestsSum: number
  otherIncome: number
  paidUnrealizedCount: number
  paidUnrealizedSum: number
  refundsCount: number
  refundsSum: number
  totalIncome: number
  cashCommission: number
  adsTotal: number
  adsBreakdown: Record<AdCampaignKey, number>
  salaries: number
  ropSalary: number
  otherExpensesTotal: number
  totalExpenses: number
  netProfit: number
  margin: number
  daysCount: number // кол-во заполненных дней
}

// ===== Вкладки-блокноты =====

export interface NoteItem {
  id: string
  title: string
  body: string
  createdAt: number
  updatedAt: number
}

export interface SearchToolItem {
  id: string
  name: string // ссылка / название инструмента
  comment: string // комментарий
  updatedAt: number
}

/**
 * Категория записи во вкладке «Сайты».
 * - 'ad'         — рекламные связки «Сайт А ⇄ Сайт Б» (разделы «А» и «Б»);
 * - 'monitoring' — Рекламные сайты «Мониторинг»;
 * - 'reviews'    — Сайты отзывов;
 * - 'salon'      — Сайты «Салон»;
 * - 'other'      — Иные сайты.
 *
 * У «простых» категорий используется только поле siteA (адрес сайта) и comment.
 * Записи без category считаются устаревшими рекламными связками ('ad'),
 * чтобы уже сохранённые данные не потерялись.
 */
export type SiteCategory = 'ad' | 'monitoring' | 'reviews' | 'salon' | 'other'

export const SIMPLE_SITE_CATEGORIES: {
  key: Exclude<SiteCategory, 'ad'>
  label: string
}[] = [
  { key: 'monitoring', label: 'Рекламные сайты «Мониторинг»' },
  { key: 'reviews', label: 'Сайты отзывов' },
  { key: 'salon', label: 'Сайты «Салон»' },
  { key: 'other', label: 'Иные сайты' },
]

export interface AdSiteItem {
  id: string
  category?: SiteCategory // по умолчанию (undefined) — рекламная связка 'ad'
  siteA: string // рекламный сайт "А" (для простых категорий — адрес сайта)
  siteB: string // платёжный сайт "Б"
  campaign: AdCampaignKey | '' // рекламная компания, относящаяся к сайту "А"
  cashier: CashierName | '' // касса, через которую проходит сайт ("Platega" / "Cashera")
  comment: string
  updatedAt: number
}

/** Запись во вкладке «Боты» (по аналогии с поисковыми инструментами). */
export interface BotItem {
  id: string
  name: string // название / ссылка бота
  comment: string // комментарий по боту
  updatedAt: number
}

/** Запись во вкладке «Номера/Карты»: телефон или номер карты с комментарием. */
export interface ContactItem {
  id: string
  kind: 'phone' | 'card' // тип записи: телефон или банковская карта
  value: string // сам номер
  comment: string // комментарий
  updatedAt: number
}

/**
 * Провайдеры почты для вкладки «Почты». Каждый провайдер — отдельный
 * подраздел со своей таблицей почтовых аккаунтов.
 */
export const EMAIL_PROVIDERS = [
  { key: 'yandex', label: 'Yandex' },
  { key: 'mailru', label: 'Mail.ru' },
  { key: 'gmail', label: 'Gmail' },
  { key: 'inboxeu', label: 'Inbox.eu' },
  { key: 'proton', label: 'Proton Mail' },
  { key: 'tuta', label: 'Tuta.com' },
  { key: 'other', label: 'Other' },
] as const

export type EmailProviderKey = (typeof EMAIL_PROVIDERS)[number]['key']

/** Запись во вкладке «Почты»: почтовый аккаунт и комментарий к нему. */
export interface EmailItem {
  id: string
  provider: EmailProviderKey // провайдер почты (подраздел)
  account: string // наименование почтового аккаунта
  comment: string // комментарий к аккаунту
  updatedAt: number
}

export type EmployeeStatus = 'working' | 'not_working'

/** Сотрудник для вкладки «Сотрудники/Доступы». */
export interface EmployeeItem {
  id: string
  fullName: string // ФИО сотрудника
  position: string // должность
  phone: string // номер телефона
  salaryCard: string // номер карты для зарплаты
  crmAccess: string // доступы CRM
  status: EmployeeStatus // «Работает» / «Не работает»
  updatedAt: number
}

export interface CalcNote {
  id: string
  text: string
  createdAt: number
}

/**
 * Документ полноцен��ого текстового редактора во вкладке «БЛОКНОТ».
 * Содержимое хранится как HTML (форматирование: шрифт, размер, цвет, списки,
 * выравнивание). `history` — стек предыдущих версий для отката изменений.
 */
export interface DocItem {
  id: string
  title: string
  html: string // форматированный текст (HTML)
  createdAt: number
  updatedAt: number
}

// ===== Хранилище паролей и доступов (вкладка «Пароли») =====

/**
 * Верхнеуровневые разделы хранилища доступов:
 * - 'mail'     — почтовые аккаунты (дополнительно делятся по провайдерам);
 * - 'services' — сервисы (любые сайты и веб-сервисы);
 * - 'other'    — иные доступы, не попавшие в предыдущие разделы.
 */
export type VaultSection = 'mail' | 'services' | 'other'

export const VAULT_SECTIONS = [
  { key: 'mail', label: 'Почтовые аккаунты' },
  { key: 'services', label: 'Сервисы' },
  { key: 'other', label: 'Иные' },
] as const

/**
 * Подразделы раздела «Почтовые аккаунты». Пользователь выбирает, в какой
 * почтовый сервис сохранить данные для входа.
 */
export const VAULT_MAIL_PROVIDERS = [
  { key: 'gmail', label: 'Gmail' },
  { key: 'yandex', label: 'Яндекс' },
  { key: 'mailru', label: 'Mail' },
  { key: 'proton', label: 'Proton' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'other', label: 'Иные' },
] as const

export type VaultMailProviderKey = (typeof VAULT_MAIL_PROVIDERS)[number]['key']

/**
 * Запись в хранилище доступов: сайт/сервис, логин, пароль и комментарий.
 * Для раздела «Почтовые аккаунты» дополнительно указывается провайдер
 * (`mailProvider`) — подраздел, в котором хранится запись.
 */
export interface VaultItem {
  id: string
  section: VaultSection
  mailProvider?: VaultMailProviderKey // подраздел (только для section === 'mail')
  service: string // сайт / название сервиса / почтовый ящик
  login: string // логин / имя пользователя (необязательно)
  password: string // пароль / доступ
  comment: string // комментарий
  updatedAt: number
}

// ===== Промты (сохранённые инструкции для нейросетей) =====

/**
 * Сохранённый промт-инструкция. Работает по принципу блокнота: заголовок +
 * отдельное краткое описание + полный текст промта, который удобно
 * скопировать целиком.
 *
 * `description` — необязательное поле (у ранее сохранённых промтов его нет),
 * чтобы существующие данные не потерялись при обновлении.
 */
export interface PromptItem {
  id: string
  title: string
  description?: string
  body: string
  createdAt: number
  updatedAt: number
}
