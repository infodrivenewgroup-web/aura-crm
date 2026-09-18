// Клиентские утилиты форматирования результатов поиска (без серверного кода).

/** Человекочитаемые подписи для распространённых полей ответа. */
const FIELD_LABELS: Record<string, string> = {
  phone: 'Телефон',
  phones: 'Телефоны',
  number: 'Номер',
  email: 'Email',
  mails: 'Почты',
  emails: 'Почты',
  fio: 'ФИО',
  full_name: 'ФИО',
  first_name: 'Имя',
  last_name: 'Фамилия',
  middle_name: 'Отчество',
  username: 'Имя пользователя',
  birthday: 'Дата рождения',
  birth_day: 'День рождения',
  birth_month: 'Месяц рождения',
  birth_year: 'Год рождения',
  inn: 'ИНН',
  snils: 'СНИЛС',
  passport: 'Паспорт',
  address: 'Адрес',
  addresses: 'Адреса',
  locations: 'Локации',
  ip: 'IP-адрес',
  vin: 'VIN',
  grn: 'Гос. номер',
  driver_license: 'Водительское удостоверение',
  region: 'Регион',
  city: 'Город',
  country: 'Страна',
  source: 'Источник',
  database: 'База данных',
  tags: 'Теги',
  telegram_id: 'Telegram ID',
  user_id: 'ID пользователя',
  is_premium: 'Premium',
  last_online: 'Был в сети',
  registration: 'Регистрация',
  gender: 'Пол',
  operator: 'Оператор',
}

/** Возвращает подпись для ключа поля (или аккуратно форматирует сам ключ). */
export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Приводит произвольное значение к читаемой строке. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Таблица соответствия лимит → цена для типов с параметром limit (например inn_ul). */
export const LIMIT_PRICE_TABLE: { limit: number; price: number }[] = [
  { limit: 100, price: 1.0 },
  { limit: 1000, price: 10.0 },
  { limit: 10000, price: 100.0 },
  { limit: 30000, price: 300.0 },
]

/** Линейная цена за лимит: $0.01 за единицу (100 → $1.00, 30000 → $300.00). */
export function priceForLimit(limit: number): number {
  const safe = Math.min(30000, Math.max(1, Math.round(limit || 0)))
  return Math.round(safe) * 0.01
}

/** Форматирует доллары: 1.5 → "$1.50". */
export function usd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—'
  return `$${amount.toFixed(2)}`
}

/** Валидация ИНН: 10 или 12 цифр. */
export function isValidInn(inn: string): boolean {
  return /^\d{10}$|^\d{12}$/.test(inn.trim())
}

/** Валидация даты YYYY-MM-DD. */
export function isValidDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const dt = new Date(d)
  return !Number.isNaN(dt.getTime())
}

/** Человекочитаемый статус задачи. */
export function statusLabel(state: string): string {
  switch (state) {
    case 'queued':
    case 'pending':
      return 'В очереди'
    case 'processing':
    case 'running':
    case 'in_progress':
      return 'Выполняется'
    case 'succeeded':
    case 'success':
    case 'done':
      return 'Завершён'
    case 'failed':
    case 'error':
      return 'Ошибка'
    default:
      return state || 'Обработка'
  }
}
