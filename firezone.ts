import 'server-only'

/**
 * Серверный клиент для Firezone Cloud REST API (beta).
 *
 * ВАЖНО про архитектуру:
 * Это НОВЫЙ Firezone (app.firezone.dev), а не legacy self-hosted.
 * Устройства подключаются через официальное приложение Firezone Client
 * (вход по email OTP), а НЕ через .conf/QR WireGuard. REST API позволяет
 * управлять людьми (actors), устройствами (clients), ресурсами, политиками,
 * сайтами и читать живой статус.
 *
 * Токен и адрес НИКОГДА не попадают на клиент — браузер обращается только к
 * внутренним роутам /api/vpn/*, а они проксируют запросы к Firezone.
 *
 * Переменные окружения:
 *   FIREZONE_API_TOKEN (или FIREZONE_TOKEN) — Bearer-токен из портала (вкладка REST). Обязателен.
 *   FIREZONE_API_URL   — необязательно, по умолчанию https://rest-api.firezone.dev
 */

const BASE_URL = (process.env.FIREZONE_API_URL ?? 'https://rest-api.firezone.dev').replace(/\/$/, '')

/**
 * Достаёт чистый токен из переменной окружения.
 * Защищает от частой ошибки: когда в значение случайно вставляют всю строку
 * присваивания целиком, например `FIREZONE_TOKEN="abc..."` вместо самого `abc...`.
 * Убирает ведущее `ИМЯ=` и окружающие кавычки/пробелы.
 */
function sanitizeToken(raw: string | undefined): string {
  let t = (raw ?? '').trim()
  // Срезаем случайно вставленный префикс `FIREZONE_API_TOKEN=` / `FIREZONE_TOKEN=`.
  t = t.replace(/^\s*FIREZONE(?:_API)?_TOKEN\s*=\s*/i, '')
  // Срезаем хвостовые обратные слэши (артефакт переноса строки при копировании).
  t = t.replace(/\\+$/, '')
  // Срезаем окружающие кавычки, даже если они несимметричны.
  t = t.replace(/^["']+/, '').replace(/["']+$/, '')
  return t.trim()
}

const TOKEN = sanitizeToken(process.env.FIREZONE_API_TOKEN ?? process.env.FIREZONE_TOKEN)

/** VPN считается настроенным, если задан токен доступа к REST API. */
export const VPN_CONFIGURED = TOKEN.trim().length > 0

/* ------------------------------- типы --------------------------------- */

export interface Pagination {
  limit?: number
  next_page?: string | null
  prev_page?: string | null
  total?: number
}

export interface FzAccount {
  id: string
  slug: string
  key: string
  name: string
  legal_name?: string
  limits?: Record<string, number | null>
}

export type ActorType = 'account_user' | 'account_admin_user' | 'service_account'

export interface FzActor {
  id: string
  name: string
  email: string | null
  type: ActorType | string
  allow_email_otp_sign_in?: boolean
  disabled_at?: string | null
  last_seen_at?: string | null
  inserted_at?: string
  updated_at?: string
}

export interface FzClient {
  id: string
  actor_id: string
  name: string
  ipv4: string
  ipv6: string
  online: boolean
  hostname?: string | null
  device_serial?: string | null
  verified_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface FzResource {
  id: string
  name: string
  type: 'cidr' | 'ip' | 'dns' | 'static_device_pool' | string
  address?: string
  address_description?: string
  site_id?: string
  ip_stack?: string
}

export interface FzPolicy {
  id: string
  group_id: string | null
  resource_id: string
  description?: string | null
}

export interface FzGroup {
  id: string
  name: string
}

export interface FzSite {
  id: string
  name: string
}

export interface FzGateway {
  id: string
  name: string
  ipv4: string
  ipv6: string
  online: boolean
}

/* ----------------------------- ошибки --------------------------------- */

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Некорректный запрос. Проверьте введённые данные.'
    case 401:
      return 'Неверный или истёкший токен REST API Firezone.'
    case 403:
      return 'Доступ запрещён. Проверьте права токена.'
    case 404:
      return 'Объект не найден.'
    case 422:
      return 'Данные не прошли проверку Firezone.'
    case 429:
      return 'Слишком много запросов к Firezone. Подождите немного.'
    default:
      return 'Firezone вернул ошибку. Попробуйте позже.'
  }
}

export class FirezoneError extends Error {
  status: number
  constructor(status: number, message?: string) {
    super(message ?? messageForStatus(status))
    this.status = status
  }
}

/* --------------------------- низкий уровень --------------------------- */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Базовый авторизованный запрос к Firezone REST API.
 * Обрабатывает лимиты (HTTP 429 + Retry-After): ждёт указанное время и
 * повторяет запрос один раз.
 */
async function fzFetch<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })

  // Соблюдаем rate limit: 1 req/sec, burst 20.
  if (res.status === 429 && attempt < 2) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '1')
    const waitMs = Math.min(Math.max(retryAfter, 1), 10) * 1000
    await sleep(waitMs)
    return fzFetch<T>(path, init, attempt + 1)
  }

  if (res.status === 204) return {} as T

  const text = await res.text()
  let json: unknown = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    const apiMsg =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error)
        : undefined
    throw new FirezoneError(res.status, apiMsg && apiMsg !== 'undefined' ? apiMsg : undefined)
  }

  return json as T
}

/** Обёртка для списочных ответов { data, metadata }. */
interface ListResponse<T> {
  data: T[]
  metadata?: Pagination
}

/** Загружает все страницы списка, аккуратно следуя курсору (с ограничением). */
async function listAll<T>(path: string, maxPages = 5): Promise<T[]> {
  const items: T[] = []
  let cursor: string | null | undefined
  for (let page = 0; page < maxPages; page++) {
    const q = new URLSearchParams({ limit: '100' })
    if (cursor) q.set('page_cursor', cursor)
    const res = await fzFetch<ListResponse<T>>(`${path}?${q.toString()}`, { method: 'GET' })
    if (Array.isArray(res.data)) items.push(...res.data)
    cursor = res.metadata?.next_page
    if (!cursor) break
    // Небольшая пауза между страницами, чтобы не упереться в лимит.
    await sleep(250)
  }
  return items
}

/* ---------------------------- публичный API --------------------------- */

export async function getAccount(): Promise<FzAccount> {
  const res = await fzFetch<{ data: FzAccount }>('/account', { method: 'GET' })
  return res.data
}

export async function listActors(): Promise<FzActor[]> {
  return listAll<FzActor>('/actors')
}

export async function createActor(input: {
  name: string
  email: string
  type?: ActorType
  allow_email_otp_sign_in?: boolean
}): Promise<FzActor> {
  const res = await fzFetch<{ data: FzActor }>('/actors', {
    method: 'POST',
    body: JSON.stringify({
      actor: {
        name: input.name,
        email: input.email,
        type: input.type ?? 'account_user',
        allow_email_otp_sign_in: input.allow_email_otp_sign_in ?? true,
      },
    }),
  })
  return res.data
}

export async function deleteActor(id: string): Promise<void> {
  await fzFetch(`/actors/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listClients(): Promise<FzClient[]> {
  return listAll<FzClient>('/clients')
}

export async function verifyClient(id: string): Promise<void> {
  await fzFetch(`/clients/${encodeURIComponent(id)}/verify`, { method: 'PUT' })
}

export async function unverifyClient(id: string): Promise<void> {
  await fzFetch(`/clients/${encodeURIComponent(id)}/unverify`, { method: 'PUT' })
}

export async function deleteClient(id: string): Promise<void> {
  await fzFetch(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listResources(): Promise<FzResource[]> {
  return listAll<FzResource>('/resources')
}

export async function createResource(input: {
  name: string
  type: 'cidr' | 'ip' | 'dns'
  address: string
  site_id: string
  address_description?: string
  ip_stack?: 'ipv4_only' | 'ipv6_only' | 'dual'
}): Promise<FzResource> {
  const resource: Record<string, unknown> = {
    name: input.name,
    type: input.type,
    address: input.address,
    site_id: input.site_id,
  }
  if (input.address_description) resource.address_description = input.address_description
  if (input.type === 'dns' && input.ip_stack) resource.ip_stack = input.ip_stack
  const res = await fzFetch<{ data: FzResource }>('/resources', {
    method: 'POST',
    body: JSON.stringify({ resource }),
  })
  return res.data
}

export async function deleteResource(id: string): Promise<void> {
  await fzFetch(`/resources/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listPolicies(): Promise<FzPolicy[]> {
  return listAll<FzPolicy>('/policies')
}

export async function createPolicy(input: {
  group_id: string
  resource_id: string
  description?: string
}): Promise<FzPolicy> {
  const res = await fzFetch<{ data: FzPolicy }>('/policies', {
    method: 'POST',
    body: JSON.stringify({
      policy: {
        group_id: input.group_id,
        resource_id: input.resource_id,
        description: input.description ?? '',
      },
    }),
  })
  return res.data
}

export async function deletePolicy(id: string): Promise<void> {
  await fzFetch(`/policies/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listGroups(): Promise<FzGroup[]> {
  return listAll<FzGroup>('/groups')
}

export async function listSites(): Promise<FzSite[]> {
  return listAll<FzSite>('/sites')
}

export async function listGateways(siteId: string): Promise<FzGateway[]> {
  return listAll<FzGateway>(`/sites/${encodeURIComponent(siteId)}/gateways`)
}

/* ---------------------- агрегированные операции ----------------------- */

export interface VpnOverview {
  account: FzAccount
  sites: (FzSite & { gateways: FzGateway[] })[]
  clients: FzClient[]
  actorsCount: number
  resources: FzResource[]
  policies: FzPolicy[]
  fullTunnel: boolean
  gatewayHealthy: boolean
}

/** Проверяет, есть ли ресурс полного туннеля (0.0.0.0/0). */
function isFullTunnelResource(r: FzResource): boolean {
  return r.type === 'cidr' && (r.address === '0.0.0.0/0' || r.address === '::/0')
}

/**
 * Собирает полную сводку для дашборда за один вызов.
 * Делает ~5–8 запросов подряд — укладывается в burst-лимит (20).
 */
export async function getOverview(): Promise<VpnOverview> {
  const [account, sites, clients, actors, resources, policies] = await Promise.all([
    getAccount(),
    listSites(),
    listClients(),
    listActors(),
    listResources(),
    listPolicies(),
  ])

  const sitesWithGw = await Promise.all(
    sites.map(async (s) => ({ ...s, gateways: await listGateways(s.id) })),
  )

  const gatewayHealthy = sitesWithGw.some((s) => s.gateways.some((g) => g.online))
  const fullTunnel = resources.some(isFullTunnelResource)

  return {
    account,
    sites: sitesWithGw,
    clients,
    actorsCount: actors.length,
    resources,
    policies,
    fullTunnel,
    gatewayHealthy,
  }
}

/**
 * Включает режим «полный VPN-туннель»: создаёт CIDR-ресурс 0.0.0.0/0 на
 * первом сайте и политику для группы (по умолчанию «Everyone»), чтобы через
 * VPN шёл весь трафик. Идемпотентно — не дублирует существующий ресурс.
 */
export async function enableFullTunnel(): Promise<{ created: boolean; resourceId: string }> {
  const [sites, resources, groups] = await Promise.all([listSites(), listResources(), listGroups()])
  const existing = resources.find(isFullTunnelResource)
  if (existing) return { created: false, resourceId: existing.id }

  const site = sites[0]
  if (!site) throw new FirezoneError(400, 'Не найден ни один сайт Firezone.')

  const resource = await createResource({
    name: 'Full Tunnel',
    type: 'cidr',
    address: '0.0.0.0/0',
    site_id: site.id,
    address_description: 'Весь трафик через VPN',
  })

  // Привязываем к группе «Everyone», если она есть, иначе к первой группе.
  const group = groups.find((g) => /everyone/i.test(g.name)) ?? groups[0]
  if (group) {
    await createPolicy({
      group_id: group.id,
      resource_id: resource.id,
      description: 'Полный туннель для всех',
    })
  }

  return { created: true, resourceId: resource.id }
}

/* --------------------------- утилиты роутов --------------------------- */

/** Оборачивает обработчик роута: единые ошибки и «не настроено». */
export async function vpnHandler(fn: () => Promise<unknown>): Promise<Response> {
  if (!VPN_CONFIGURED) {
    return Response.json(
      {
        message:
          'VPN не настроен. Администратору нужно задать переменную окружения FIREZONE_API_TOKEN (токен из портала Firezone, вкладка REST).',
        notConfigured: true,
      },
      { status: 503 },
    )
  }
  try {
    const data = await fn()
    return Response.json(data ?? {}, { status: 200 })
  } catch (err) {
    if (err instanceof FirezoneError) {
      return Response.json({ message: err.message }, { status: err.status })
    }
    return Response.json(
      { message: 'Firezone недоступен. Проверьте подключение и попробуйте снова.' },
      { status: 503 },
    )
  }
}

/** Безопасно читает JSON тела запроса. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json()
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
