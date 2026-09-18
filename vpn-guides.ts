import {
  Apple,
  Laptop,
  type LucideIcon,
  MonitorSmartphone,
  Smartphone,
  Tablet,
  Terminal,
} from 'lucide-react'

/**
 * Публичные параметры VPN на базе Firezone Cloud (app.firezone.dev).
 *
 * ВАЖНО: это НОВЫЙ Firezone (zero-trust), а не legacy self-hosted.
 * Устройства подключаются через приложение Firezone Client и вход по email
 * (одноразовый код), а НЕ через файлы .conf или QR WireGuard.
 *
 * Здесь НЕТ секретов: только публичные идентификаторы аккаунта и ссылки.
 * REST API-токен хранится только на сервере (переменная FIREZONE_API_TOKEN).
 */
export const VPN_CONFIG = {
  productName: 'Firezone',
  accountName: 'Info-Drive',
  /** Слаг аккаунта — его вводят в приложении Firezone Client при входе. */
  accountSlug: 'conventional_right',
  accountId: '4f636d47-2a06-4894-85dd-14c807fea363',
  /** Портал администратора Firezone Cloud. */
  adminPortalUrl: 'https://app.firezone.dev/conventional_right',
  /** Публичная страница загрузки клиентских приложений. */
  clientsDownloadUrl: 'https://www.firezone.dev/kb/client-apps',
  /** Где взять REST API-токен: портал → Settings → REST. */
  apiTokenUrl: 'https://app.firezone.dev/conventional_right/settings/api_clients',
  gatewayIp: '104.248.203.141',
  siteName: 'Default Site',
} as const

/** Ссылки на разделы портала Firezone Cloud. */
export const adminLinks = [
  { label: 'Открыть портал Firezone', href: VPN_CONFIG.adminPortalUrl, hint: 'Главная панель управления' },
  { label: 'Люди (Actors)', href: `${VPN_CONFIG.adminPortalUrl}/actors`, hint: 'Пользователи аккаунта' },
  { label: 'Устройства (Clients)', href: `${VPN_CONFIG.adminPortalUrl}/clients`, hint: 'Подключённые устройства' },
  { label: 'Ресурсы (Resources)', href: `${VPN_CONFIG.adminPortalUrl}/resources`, hint: 'Что доступно через VPN' },
  { label: 'Политики (Policies)', href: `${VPN_CONFIG.adminPortalUrl}/policies`, hint: 'Кому что разрешено' },
  { label: 'Сайты и шлюзы (Sites)', href: `${VPN_CONFIG.adminPortalUrl}/sites`, hint: 'Серверы-шлюзы' },
] as const

/* ------------------------------------------------------------------ */
/* Типы живых данных (приходят с /api/vpn/overview)                    */
/* ------------------------------------------------------------------ */

export interface OvAccount {
  id: string
  slug: string
  key: string
  name: string
  limits?: Record<string, number | null>
}
export interface OvGateway {
  id: string
  name: string
  ipv4: string
  ipv6: string
  online: boolean
}
export interface OvSite {
  id: string
  name: string
  gateways: OvGateway[]
}
export interface OvClient {
  id: string
  actor_id: string
  name: string
  ipv4: string
  ipv6: string
  online: boolean
  verified_at?: string | null
  updated_at?: string
}
export interface OvActor {
  id: string
  name: string
  email: string | null
  type: string
  disabled_at?: string | null
  last_seen_at?: string | null
}
export interface OvResource {
  id: string
  name: string
  type: string
  address?: string
  address_description?: string
}
export interface OvPolicy {
  id: string
  group_id: string | null
  resource_id: string
  description?: string | null
}
export interface Overview {
  account: OvAccount
  sites: OvSite[]
  clients: OvClient[]
  actors?: OvActor[]
  actorsCount: number
  resources: OvResource[]
  policies: OvPolicy[]
  fullTunnel: boolean
  gatewayHealthy: boolean
}

/* ------------------------------------------------------------------ */
/* Инструкции по подключению устройств (модель Firezone Client)         */
/* ------------------------------------------------------------------ */

export interface DeviceGuide {
  id: string
  label: string
  icon: LucideIcon
  store: string
  steps: string[]
}

/** Общие шаги входа — одинаковы на всех платформах. */
export const commonSignInSteps: string[] = [
  'Откройте приложение Firezone и нажмите «Sign in».',
  `Введите слаг аккаунта: ${VPN_CONFIG.accountSlug}`,
  'Укажите свой email — на него придёт одноразовый код.',
  'Введите код из письма, чтобы войти.',
  'Включите тумблер подключения — Firezone построит защищённый туннель.',
]

export const deviceGuides: DeviceGuide[] = [
  {
    id: 'ios',
    label: 'iPhone / iPad',
    icon: Smartphone,
    store: 'App Store',
    steps: [
      'В App Store найдите и установите приложение «Firezone».',
      'Откройте Firezone и нажмите «Sign in».',
      `Введите слаг аккаунта: ${VPN_CONFIG.accountSlug}`,
      'Укажите email — придёт одноразовый код, введите его.',
      'Разрешите добавление конфигурации VPN, когда система спросит.',
      'Включите тумблер — в статус-баре появится значок VPN.',
    ],
  },
  {
    id: 'android',
    label: 'Android',
    icon: Smartphone,
    store: 'Google Play',
    steps: [
      'В Google Play установите приложение «Firezone».',
      'Откройте его и нажмите «Sign in».',
      `Введите слаг аккаунта: ${VPN_CONFIG.accountSlug}`,
      'Укажите email и введите одноразовый код из письма.',
      'Разрешите создание VPN-подключения.',
      'Отключите экономию батареи для Firezone и включите тумблер.',
    ],
  },
  {
    id: 'windows',
    label: 'Windows',
    icon: MonitorSmartphone,
    store: 'firezone.dev/kb/client-apps',
    steps: [
      'Скачайте клиент Firezone для Windows со страницы загрузки.',
      'Установите приложение и запустите его.',
      'Нажмите «Sign in» и введите слаг аккаунта: ' + VPN_CONFIG.accountSlug,
      'Укажите email и введите одноразовый код из письма.',
      'Значок Firezone появится в трее — подключение активно.',
    ],
  },
  {
    id: 'macos',
    label: 'macOS',
    icon: Laptop,
    store: 'Mac App Store',
    steps: [
      'Установите «Firezone» из Mac App Store (или .dmg со страницы загрузки).',
      'Откройте приложение и нажмите «Sign in».',
      `Введите слаг аккаунта: ${VPN_CONFIG.accountSlug}`,
      'Укажите email и введите одноразовый код из письма.',
      'Разрешите добавление VPN-конфигурации в системных настройках.',
      'Значок Firezone появится в строке меню — туннель активен.',
    ],
  },
  {
    id: 'tablet',
    label: 'Планшет',
    icon: Tablet,
    store: 'App Store / Google Play',
    steps: [
      'Установите «Firezone» из магазина приложений вашего планшета.',
      'Откройте приложение и нажмите «Sign in».',
      `Введите слаг аккаунта: ${VPN_CONFIG.accountSlug}`,
      'Укажите email и введите одноразовый код из письма.',
      'Разрешите VPN-подключение и включите тумблер.',
    ],
  },
  {
    id: 'linux',
    label: 'Linux',
    icon: Terminal,
    store: 'firezone.dev/kb/client-apps',
    steps: [
      'Скачайте headless- или GUI-клиент Firezone для Linux со страницы загрузки.',
      'Установите пакет согласно инструкции для вашего дистрибутива.',
      'Запустите клиент и выполните вход по слагу аккаунта и email-коду.',
      'Для серверов используйте Service Account и токен вместо email-входа.',
    ],
  },
]

/* iOS платформам — фирменное яблоко там, где уместно (иконка для быстрых ссылок). */
export const appleIcon: LucideIcon = Apple

/* ------------------------------------------------------------------ */
/* Как это устроено                                                    */
/* ------------------------------------------------------------------ */

export const howItWorks: { title: string; text: string }[] = [
  {
    title: '1. Человек — это «Actor»',
    text: 'В Firezone каждый пользователь (вы, родственник) — это Actor. Создаётся здесь на странице или в портале.',
  },
  {
    title: '2. Устройство — это «Client»',
    text: 'Когда человек входит в приложение Firezone, появляется Client — конкретный телефон или компьютер.',
  },
  {
    title: '3. Доступ задаёт «Policy»',
    text: 'Политика связывает группу людей с ресурсом. Хотите «весь трафик через VPN» — включите полный туннель ниже.',
  },
  {
    title: '4. Трафик идёт через «Gateway»',
    text: `Шлюз на ${VPN_CONFIG.gatewayIp} пропускает разрешённый трафик. Пока он «Healthy» — VPN работает.`,
  },
]

/* ------------------------------------------------------------------ */
/* Жизненные сценарии                                                  */
/* ------------------------------------------------------------------ */

export interface LifeScenario {
  title: string
  steps: string
}

export const lifeScenarios: LifeScenario[] = [
  {
    title: 'Подключить своё новое устройство',
    steps: 'Установите приложение Firezone → войдите по слагу и email-коду → включите туннель.',
  },
  {
    title: 'Дать доступ родственнику',
    steps: 'Добавьте человека в разделе «Люди» → он ставит приложение и входит своим email → устройство появится в «Устройствах».',
  },
  {
    title: 'Человек поменял телефон',
    steps: 'На новом телефоне он просто входит снова — появится новый Client. Старый можно удалить в «Устройствах».',
  },
  {
    title: 'Телефон потерян',
    steps: 'В разделе «Устройства» удалите нужный Client — доступ пропадёт сразу. При желании отключите самого человека.',
  },
  {
    title: 'Сделать «весь трафик через VPN»',
    steps: 'В разделе «Доступ и трафик» нажмите «Включить полный туннель» — создастся ресурс 0.0.0.0/0 и политика для всех.',
  },
  {
    title: 'Проверить, кто сейчас онлайн',
    steps: 'Раздел «Устройства» показывает живой статус: зелёная точка — устройство подключено к VPN прямо сейчас.',
  },
]

/* ------------------------------------------------------------------ */
/* Частые проблемы                                                     */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  q: string
  a: string
}

export const faqItems: FaqItem[] = [
  {
    q: 'Нет файлов .conf и QR-кодов — это нормально?',
    a: 'Да. Это новый Firezone (zero-trust), а не старый WireGuard-портал. Устройства подключаются через приложение Firezone Client и вход по email-коду, без импорта конфигов.',
  },
  {
    q: 'Что вводить в приложении при входе?',
    a: `Слаг аккаунта — ${VPN_CONFIG.accountSlug}. Затем свой email; на него придёт одноразовый код для входа.`,
  },
  {
    q: 'Через VPN идёт не весь трафик',
    a: 'Firezone по умолчанию пропускает только заданные ресурсы. Чтобы шёл весь трафик, включите полный туннель в разделе «Доступ и трафик» (ресурс 0.0.0.0/0).',
  },
  {
    q: 'Устройство не подключается',
    a: 'Проверьте, что человек не отключён в «Людях», что шлюз (Gateway) в статусе Healthy, и что для его группы есть политика доступа. Затем переподключите туннель в приложении.',
  },
  {
    q: 'Как убрать доступ у конкретного устройства',
    a: 'В разделе «Устройства» удалите нужный Client. Чтобы полностью закрыть доступ человеку — отключите или удалите его в «Людях».',
  },
  {
    q: 'Что такое «подтверждённое» устройство',
    a: 'Вы можете пометить устройство как проверенное (verified) — это подтверждает, что оно принадлежит доверенному человеку. Управляется кнопкой в списке устройств.',
  },
]
