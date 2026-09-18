'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type AdSiteItem,
  type BotItem,
  type CalcNote,
  type ContactItem,
  type EmailItem,
  type EmployeeItem,
  type DayInput,
  type DayRecord,
  type DocItem,
  type NoteItem,
  type SearchToolItem,
  type VaultItem,
  type PromptItem,
} from '@/lib/types'
import { computeDay, emptyDay, emptyInput } from '@/lib/calc'
import { START_DATE } from '@/lib/calc'
import { addDays, nextDay, parseISO, toISO } from '@/lib/format'
import {
  loadAllState,
  saveManyState,
  saveState,
  type AllState,
  type StateKey,
} from '@/app/actions/state'

/**
 * localStorage keys are kept as an OFFLINE BACKUP / cache only. The database
 * (Neon) is the source of truth so that data survives a browser change, a
 * device change, or a crash. On load we read the database; localStorage is
 * used (a) to migrate any pre-existing local data into the database the first
 * time, and (b) as a fallback if the network is temporarily unavailable.
 */
const KEYS = {
  days: 'aurum:days:v1',
  notes: 'aurum:notes:v1',
  tools: 'aurum:tools:v1',
  sites: 'aurum:sites:v1',
  calcNotes: 'aurum:calcnotes:v1',
  bots: 'aurum:bots:v1',
  contacts: 'aurum:contacts:v1',
  emails: 'aurum:emails:v1',
  employees: 'aurum:employees:v1',
  docs: 'aurum:docs:v1',
  vault: 'aurum:vault:v1',
  prompts: 'aurum:prompts:v1',
}

/** Все коллекции состояния — единый источник для загрузки и синхронизации. */
const ALL_STATE_KEYS: StateKey[] = [
  'days',
  'notes',
  'tools',
  'sites',
  'calcNotes',
  'bots',
  'contacts',
  'emails',
  'employees',
  'docs',
  'vault',
  'prompts',
]

/** Как часто фоново опрашивать облако на предмет изменений с других устройств. */
const POLL_INTERVAL_MS = 8000

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota errors */
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * Races a promise against a timeout. Used so the initial database read can
 * never block the UI indefinitely on a restrictive network, corporate proxy,
 * or VPN — if the cloud does not answer in time we open the app from the local
 * backup and keep retrying the connection in the background.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      },
    )
  })
}

/**
 * Гарантирует непрерывность дней от START_DATE до последнего дня и
 * наличие одной редактируемой строки на следующий день после последнего
 * заполненного («Загрузить данные»).
 */
function ensureContinuity(input: DayRecord[]): DayRecord[] {
  const map = new Map<string, DayRecord>()
  for (const d of input) map.set(d.date, d)
  if (map.size === 0) map.set(START_DATE, emptyDay(START_DATE))

  const dates = [...map.keys()].sort()
  let min = dates[0]
  if (min > START_DATE) min = START_DATE
  let max = dates[dates.length - 1]

  // последний отправленный день -> следующий день должен существовать
  const submitted = [...map.values()].filter((d) => d.submitted).map((d) => d.date)
  if (submitted.length > 0) {
    const lastSubmitted = submitted.sort()[submitted.length - 1]
    const nxt = nextDay(lastSubmitted)
    if (nxt > max) max = nxt
  }

  // заполнить пропуски
  const result: DayRecord[] = []
  let cursor = min
  // safety bound
  let guard = 0
  while (cursor <= max && guard < 4000) {
    result.push(map.get(cursor) ?? emptyDay(cursor))
    cursor = nextDay(cursor)
    guard++
  }
  return result.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

interface StoreValue {
  days: DayRecord[]
  loaded: boolean
  syncStatus: SyncStatus
  getDay: (date: string) => DayRecord | undefined
  updateDayInput: (date: string, patch: Partial<DayInput>) => void
  submitDay: (date: string) => void
  resetDay: (date: string) => void
  deleteDay: (date: string) => void
  addManualDay: () => void

  notes: NoteItem[]
  addNote: (n: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateNote: (id: string, patch: Partial<NoteItem>) => void
  deleteNote: (id: string) => void

  tools: SearchToolItem[]
  addTool: (t: Omit<SearchToolItem, 'id' | 'updatedAt'>) => void
  updateTool: (id: string, patch: Partial<SearchToolItem>) => void
  deleteTool: (id: string) => void

  sites: AdSiteItem[]
  addSite: (s: Omit<AdSiteItem, 'id' | 'updatedAt'>) => void
  updateSite: (id: string, patch: Partial<AdSiteItem>) => void
  deleteSite: (id: string) => void

  bots: BotItem[]
  addBot: (b: Omit<BotItem, 'id' | 'updatedAt'>) => void
  updateBot: (id: string, patch: Partial<BotItem>) => void
  deleteBot: (id: string) => void

  contacts: ContactItem[]
  addContact: (c: Omit<ContactItem, 'id' | 'updatedAt'>) => void
  updateContact: (id: string, patch: Partial<ContactItem>) => void
  deleteContact: (id: string) => void

  emails: EmailItem[]
  addEmail: (e: Omit<EmailItem, 'id' | 'updatedAt'>) => void
  updateEmail: (id: string, patch: Partial<EmailItem>) => void
  deleteEmail: (id: string) => void

  employees: EmployeeItem[]
  addEmployee: (e: Omit<EmployeeItem, 'id' | 'updatedAt'>) => void
  updateEmployee: (id: string, patch: Partial<EmployeeItem>) => void
  deleteEmployee: (id: string) => void

  calcNotes: CalcNote[]
  addCalcNote: (text: string) => void
  updateCalcNote: (id: string, text: string) => void
  deleteCalcNote: (id: string) => void

  docs: DocItem[]
  addDoc: (title: string) => string
  updateDoc: (id: string, patch: Partial<Pick<DocItem, 'title' | 'html'>>) => void
  deleteDoc: (id: string) => void

  vault: VaultItem[]
  addVault: (v: Omit<VaultItem, 'id' | 'updatedAt'>) => void
  updateVault: (id: string, patch: Partial<VaultItem>) => void
  deleteVault: (id: string) => void

  prompts: PromptItem[]
  addPrompt: (p: Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'>) => string
  updatePrompt: (id: string, patch: Partial<PromptItem>) => void
  deletePrompt: (id: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [days, setDays] = useState<DayRecord[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [tools, setTools] = useState<SearchToolItem[]>([])
  const [sites, setSites] = useState<AdSiteItem[]>([])
  const [bots, setBots] = useState<BotItem[]>([])
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [emails, setEmails] = useState<EmailItem[]>([])
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [calcNotes, setCalcNotes] = useState<CalcNote[]>([])
  const [docs, setDocs] = useState<DocItem[]>([])
  const [vault, setVault] = useState<VaultItem[]>([])
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const ready = useRef(false)
  // Becomes true once the user has actually modified data on this device, so a
  // late background hydration from the cloud never overwrites local edits.
  const dirty = useRef(false)
  // Keys whose next write-through originates from a programmatic hydration
  // (initial load or background reconnect), not a user edit. Each entry is
  // consumed exactly once so it cannot mask a later genuine edit. This makes
  // dirty-detection deterministic regardless of effect timing.
  const suppressDirty = useRef<Set<StateKey>>(new Set())

  // Debounced per-key persistence to the database. We track a pending count so
  // the sync indicator only shows "saved" once every queued write has landed.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pending = useRef(0)

  // Cross-device synchronization state:
  // - pendingKeys: collections with an unsaved local edit. Background polling
  //   never overwrites these, so a device's own in-flight change is protected.
  // - serverSnapshot: JSON of the last value we know the server holds per key.
  //   Polling compares against this to detect genuine remote changes and to
  //   ignore the echo of our own writes.
  // - valuesRef: latest value of each collection, so we can flush unsaved
  //   edits synchronously when the tab is hidden (critical on mobile).
  const pendingKeys = useRef<Set<StateKey>>(new Set())
  const serverSnapshot = useRef<Record<string, string>>({})
  const valuesRef = useRef<Partial<Record<StateKey, unknown>>>({})

  const flushKey = useCallback((key: StateKey, value: unknown, localKey: string) => {
    // Track the latest value so a tab-hide flush can persist it synchronously.
    valuesRef.current[key] = value

    // Always write the local backup immediately and synchronously so that an
    // abrupt crash or offline period never loses the latest input.
    saveLocal(localKey, value)

    // A hydration-originated write only refreshes the local cache; it must not
    // mark the device "dirty" nor echo the data back to the cloud.
    if (suppressDirty.current.has(key)) {
      suppressDirty.current.delete(key)
      return
    }
    dirty.current = true
    // Protect this collection from being overwritten by background polling
    // until the edit has been safely persisted to the cloud.
    pendingKeys.current.add(key)

    if (timers.current[key]) clearTimeout(timers.current[key])
    setSyncStatus('saving')
    pending.current += 1
    timers.current[key] = setTimeout(async () => {
      try {
        await saveState(key, value)
        // Our write is now the server truth — record it so polling does not
        // treat the echo as a remote change, and release the pending guard.
        serverSnapshot.current[key] = JSON.stringify(value)
        pendingKeys.current.delete(key)
        pending.current = Math.max(0, pending.current - 1)
        if (pending.current === 0) setSyncStatus('saved')
      } catch (err) {
        console.log('[v0] saveState failed, kept local backup:', err)
        // Keep the pending guard so polling cannot clobber the unsaved edit.
        pending.current = Math.max(0, pending.current - 1)
        setSyncStatus('error')
      }
    }, 500)
  }, [])

  // ---- initial load: database is source of truth, migrate local if needed ----
  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const ALL_KEYS: StateKey[] = [
      'days',
      'notes',
      'tools',
      'sites',
      'calcNotes',
      'bots',
      'contacts',
      'emails',
      'employees',
      'docs',
      'vault',
      'prompts',
    ]

    function readLocal() {
      return {
        days: loadLocal<DayRecord[] | null>(KEYS.days, null),
        notes: loadLocal<NoteItem[] | null>(KEYS.notes, null),
        tools: loadLocal<SearchToolItem[] | null>(KEYS.tools, null),
        sites: loadLocal<AdSiteItem[] | null>(KEYS.sites, null),
        calcNotes: loadLocal<CalcNote[] | null>(KEYS.calcNotes, null),
        bots: loadLocal<BotItem[] | null>(KEYS.bots, null),
        contacts: loadLocal<ContactItem[] | null>(KEYS.contacts, null),
        emails: loadLocal<EmailItem[] | null>(KEYS.emails, null),
        employees: loadLocal<EmployeeItem[] | null>(KEYS.employees, null),
        docs: loadLocal<DocItem[] | null>(KEYS.docs, null),
        vault: loadLocal<VaultItem[] | null>(KEYS.vault, null),
        prompts: loadLocal<PromptItem[] | null>(KEYS.prompts, null),
      }
    }

    // Apply the local backup to state and open the app immediately. The UI is
    // never blocked waiting for the network.
    function hydrateFromLocal(local: ReturnType<typeof readLocal>) {
      ALL_KEYS.forEach((k) => suppressDirty.current.add(k))
      setDays(ensureContinuity((local.days as DayRecord[] | null) ?? []))
      setNotes((local.notes as NoteItem[] | null) ?? [])
      setTools((local.tools as SearchToolItem[] | null) ?? [])
      setSites((local.sites as AdSiteItem[] | null) ?? [])
      setBots((local.bots as BotItem[] | null) ?? [])
      setContacts((local.contacts as ContactItem[] | null) ?? [])
      setEmails((local.emails as EmailItem[] | null) ?? [])
      setEmployees((local.employees as EmployeeItem[] | null) ?? [])
      setCalcNotes((local.calcNotes as CalcNote[] | null) ?? [])
      setDocs((local.docs as DocItem[] | null) ?? [])
      setVault((local.vault as VaultItem[] | null) ?? [])
      setPrompts((local.prompts as PromptItem[] | null) ?? [])
    }

    // Apply the authoritative cloud data, falling back to local per-key for any
    // collection that does not yet exist on the server. Runs both on first load
    // and on a successful background reconnect (guarded by `hydrating`).
    function hydrateFromServer(
      server: AllState,
      local: ReturnType<typeof readLocal>,
    ): Record<string, unknown> {
      const migrate: Record<string, unknown> = {}
      function pick<T>(serverVal: T | undefined, localVal: T | null, key: StateKey): T | null {
        if (serverVal !== undefined) {
          // Remember the server value so polling can detect later remote edits.
          serverSnapshot.current[key] = JSON.stringify(serverVal)
          return serverVal
        }
        if (localVal !== null && localVal !== undefined) {
          migrate[key] = localVal
          // After migration this local value becomes the server truth.
          serverSnapshot.current[key] = JSON.stringify(localVal)
          return localVal
        }
        return null
      }
      ALL_KEYS.forEach((k) => suppressDirty.current.add(k))
      setDays(ensureContinuity(pick<DayRecord[]>(server.days as DayRecord[] | undefined, local.days, 'days') ?? []))
      setNotes(pick<NoteItem[]>(server.notes as NoteItem[] | undefined, local.notes, 'notes') ?? [])
      setTools(pick<SearchToolItem[]>(server.tools as SearchToolItem[] | undefined, local.tools, 'tools') ?? [])
      setSites(pick<AdSiteItem[]>(server.sites as AdSiteItem[] | undefined, local.sites, 'sites') ?? [])
      setBots(pick<BotItem[]>(server.bots as BotItem[] | undefined, local.bots, 'bots') ?? [])
      setContacts(pick<ContactItem[]>(server.contacts as ContactItem[] | undefined, local.contacts, 'contacts') ?? [])
      setEmails(pick<EmailItem[]>(server.emails as EmailItem[] | undefined, local.emails, 'emails') ?? [])
      setEmployees(pick<EmployeeItem[]>(server.employees as EmployeeItem[] | undefined, local.employees, 'employees') ?? [])
      setCalcNotes(pick<CalcNote[]>(server.calcNotes as CalcNote[] | undefined, local.calcNotes, 'calcNotes') ?? [])
      setDocs(pick<DocItem[]>(server.docs as DocItem[] | undefined, local.docs, 'docs') ?? [])
      setVault(pick<VaultItem[]>(server.vault as VaultItem[] | undefined, local.vault, 'vault') ?? [])
      setPrompts(pick<PromptItem[]>(server.prompts as PromptItem[] | undefined, local.prompts, 'prompts') ?? [])
      return migrate
    }

    // Keep trying to reach the cloud in the background with exponential backoff.
    // Once reachable: if the user has not edited anything locally we hydrate
    // from the cloud; if they have edited offline we push their local snapshot
    // up so nothing is lost.
    function scheduleRetry(attempt: number) {
      if (cancelled) return
      const delay = Math.min(30000, Math.round(3000 * Math.pow(1.6, attempt)))
      retryTimer = setTimeout(async () => {
        if (cancelled) return
        try {
          const server = (await withTimeout(loadAllState(), 8000)) as AllState
          if (cancelled) return
          const local = readLocal()
          if (!dirty.current) {
            const migrate = hydrateFromServer(server, local)
            if (Object.keys(migrate).length > 0) await saveManyState(migrate)
          } else {
            const payload: Record<string, unknown> = {}
            for (const k of ALL_KEYS) {
              if (local[k] !== null && local[k] !== undefined) payload[k] = local[k]
            }
            if (Object.keys(payload).length > 0) await saveManyState(payload)
          }
          if (!cancelled) setSyncStatus('saved')
          console.log('[v0] cloud reconnected, data synchronized')
        } catch {
          scheduleRetry(attempt + 1)
        }
      }, delay)
    }

    ;(async () => {
      const local = readLocal()

      let server: AllState | null = null
      try {
        // Bounded wait so a blocked/slow network never freezes startup.
        server = (await withTimeout(loadAllState(), 4500)) as AllState
      } catch (err) {
        console.log('[v0] cloud unreachable at startup, using local backup:', err)
      }
      if (cancelled) return

      if (server) {
        const migrate = hydrateFromServer(server, local)
        ready.current = true
        setLoaded(true)
        setSyncStatus('saved')
        if (Object.keys(migrate).length > 0) {
          try {
            await saveManyState(migrate)
            console.log('[v0] migrated local backup into database:', Object.keys(migrate))
          } catch (err) {
            console.log('[v0] migration to database failed:', err)
          }
        }
      } else {
        // Open the app right now from the local backup, then reconnect quietly.
        hydrateFromLocal(local)
        ready.current = true
        setLoaded(true)
        setSyncStatus('error')
        scheduleRetry(0)
      }
    })()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  // ---- write-through persistence (db + local backup) ----
  useEffect(() => {
    if (ready.current) flushKey('days', days, KEYS.days)
  }, [days, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('notes', notes, KEYS.notes)
  }, [notes, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('tools', tools, KEYS.tools)
  }, [tools, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('sites', sites, KEYS.sites)
  }, [sites, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('bots', bots, KEYS.bots)
  }, [bots, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('contacts', contacts, KEYS.contacts)
  }, [contacts, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('emails', emails, KEYS.emails)
  }, [emails, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('employees', employees, KEYS.employees)
  }, [employees, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('calcNotes', calcNotes, KEYS.calcNotes)
  }, [calcNotes, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('docs', docs, KEYS.docs)
  }, [docs, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('vault', vault, KEYS.vault)
  }, [vault, flushKey])
  useEffect(() => {
    if (ready.current) flushKey('prompts', prompts, KEYS.prompts)
  }, [prompts, flushKey])

  // Applies a value fetched from the cloud to the matching collection. Marked
  // as hydration (suppressDirty) so it refreshes the local cache without being
  // echoed back to the server or flipping the dirty guard.
  const applyServerValue = useCallback((key: StateKey, value: unknown) => {
    suppressDirty.current.add(key)
    switch (key) {
      case 'days':
        setDays(ensureContinuity((value as DayRecord[]) ?? []))
        break
      case 'notes':
        setNotes((value as NoteItem[]) ?? [])
        break
      case 'tools':
        setTools((value as SearchToolItem[]) ?? [])
        break
      case 'sites':
        setSites((value as AdSiteItem[]) ?? [])
        break
      case 'bots':
        setBots((value as BotItem[]) ?? [])
        break
      case 'contacts':
        setContacts((value as ContactItem[]) ?? [])
        break
      case 'emails':
        setEmails((value as EmailItem[]) ?? [])
        break
      case 'employees':
        setEmployees((value as EmployeeItem[]) ?? [])
        break
      case 'calcNotes':
        setCalcNotes((value as CalcNote[]) ?? [])
        break
      case 'docs':
        setDocs((value as DocItem[]) ?? [])
        break
      case 'vault':
        setVault((value as VaultItem[]) ?? [])
        break
      case 'prompts':
        setPrompts((value as PromptItem[]) ?? [])
        break
      default:
        suppressDirty.current.delete(key)
    }
  }, [])

  // ---- background pull: propagate edits made on OTHER devices ----
  // Every few seconds we re-read the cloud. For any collection that this device
  // has not locally edited (not pending), we apply the server value when it
  // differs from what we last saw. This is what makes a change made on the
  // phone appear on the desktop (and vice-versa) without a manual reload.
  useEffect(() => {
    if (!loaded) return
    let stopped = false
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      try {
        const server = (await withTimeout(loadAllState(), 8000)) as AllState
        if (stopped) return
        let changed = false
        for (const key of ALL_STATE_KEYS) {
          const serverVal = server[key]
          if (serverVal === undefined) continue
          // Never overwrite a local edit that has not been persisted yet.
          if (pendingKeys.current.has(key)) continue
          const nextJson = JSON.stringify(serverVal)
          if (nextJson === serverSnapshot.current[key]) continue
          serverSnapshot.current[key] = nextJson
          applyServerValue(key, serverVal)
          changed = true
        }
        if (changed) {
          console.log('[v0] pulled remote changes from another device')
        }
      } catch {
        /* transient network issue — try again on the next tick */
      }
    }, POLL_INTERVAL_MS)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [loaded, applyServerValue])

  // ---- flush unsaved edits when the tab is hidden or closed ----
  // On mobile, switching apps or locking the screen can suspend the tab before
  // a debounced 500ms save fires, so a freshly created item would live only in
  // the local backup and never reach other devices. Persisting immediately on
  // hide closes that gap.
  useEffect(() => {
    if (!loaded) return
    function flushPending() {
      const keys = Array.from(pendingKeys.current)
      for (const key of keys) {
        if (timers.current[key]) {
          clearTimeout(timers.current[key])
          delete timers.current[key]
        }
        const value = valuesRef.current[key]
        if (value === undefined) continue
        // Fire-and-forget: the request is dispatched before suspension. On
        // success the next poll/snapshot reconciles; failures keep the local
        // backup and the pending guard for a later retry.
        void saveState(key, value)
          .then(() => {
            serverSnapshot.current[key] = JSON.stringify(value)
            pendingKeys.current.delete(key)
          })
          .catch(() => {})
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flushPending()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushPending)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushPending)
    }
  }, [loaded])

  const getDay = useCallback(
    (date: string) => days.find((d) => d.date === date),
    [days],
  )

  const updateDayInput = useCallback((date: string, patch: Partial<DayInput>) => {
    setDays((prev) => {
      const map = new Map(prev.map((d) => [d.date, d]))
      const cur = map.get(date) ?? emptyDay(date)
      map.set(date, {
        ...cur,
        input: { ...cur.input, ...patch },
        updatedAt: Date.now(),
      })
      return ensureContinuity([...map.values()])
    })
  }, [])

  const submitDay = useCallback((date: string) => {
    setDays((prev) => {
      const map = new Map(prev.map((d) => [d.date, d]))
      const cur = map.get(date) ?? emptyDay(date)
      map.set(date, { ...cur, submitted: true, updatedAt: Date.now() })
      return ensureContinuity([...map.values()])
    })
  }, [])

  const resetDay = useCallback((date: string) => {
    setDays((prev) => {
      const map = new Map(prev.map((d) => [d.date, d]))
      map.set(date, { date, input: emptyInput(), submitted: false, updatedAt: Date.now() })
      return ensureContinuity([...map.values()])
    })
  }, [])

  /**
   * Полное удаление дня. Запись убирается из набора; функция непрерывности
   * пересоберёт диапазон: если удалён последний (хвостовой) день — он
   * исчезает из журнала, если день в середине — он становится пустой
   * незаполненной строкой, готовой к повторному заполнению.
   */
  const deleteDay = useCallback((date: string) => {
    setDays((prev) => {
      const map = new Map(prev.map((d) => [d.date, d]))
      map.delete(date)
      return ensureContinuity([...map.values()])
    })
  }, [])

  const addManualDay = useCallback(() => {
    setDays((prev) => {
      if (prev.length === 0) return ensureContinuity([])
      const last = prev[prev.length - 1].date
      const nxt = nextDay(last)
      return ensureContinuity([...prev, emptyDay(nxt)])
    })
  }, [])

  // ---- notes ----
  const addNote: StoreValue['addNote'] = useCallback((n) => {
    const now = Date.now()
    const id = uid()
    setNotes((p) => [{ id, createdAt: now, updatedAt: now, ...n }, ...p])
    return id
  }, [])
  const updateNote: StoreValue['updateNote'] = useCallback((id, patch) => {
    setNotes((p) =>
      p.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    )
  }, [])
  const deleteNote = useCallback((id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id))
  }, [])

  // ---- tools ----
  const addTool: StoreValue['addTool'] = useCallback((t) => {
    setTools((p) => [{ id: uid(), updatedAt: Date.now(), ...t }, ...p])
  }, [])
  const updateTool: StoreValue['updateTool'] = useCallback((id, patch) => {
    setTools((p) =>
      p.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)),
    )
  }, [])
  const deleteTool = useCallback((id: string) => {
    setTools((p) => p.filter((t) => t.id !== id))
  }, [])

  // ---- sites ----
  const addSite: StoreValue['addSite'] = useCallback((s) => {
    setSites((p) => [{ id: uid(), updatedAt: Date.now(), ...s }, ...p])
  }, [])
  const updateSite: StoreValue['updateSite'] = useCallback((id, patch) => {
    setSites((p) =>
      p.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
    )
  }, [])
  const deleteSite = useCallback((id: string) => {
    setSites((p) => p.filter((s) => s.id !== id))
  }, [])

  // ---- bots ----
  const addBot: StoreValue['addBot'] = useCallback((b) => {
    setBots((p) => [{ id: uid(), updatedAt: Date.now(), ...b }, ...p])
  }, [])
  const updateBot: StoreValue['updateBot'] = useCallback((id, patch) => {
    setBots((p) =>
      p.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b)),
    )
  }, [])
  const deleteBot = useCallback((id: string) => {
    setBots((p) => p.filter((b) => b.id !== id))
  }, [])

  // ---- contacts (номера / карты) ----
  const addContact: StoreValue['addContact'] = useCallback((c) => {
    setContacts((p) => [{ id: uid(), updatedAt: Date.now(), ...c }, ...p])
  }, [])
  const updateContact: StoreValue['updateContact'] = useCallback((id, patch) => {
    setContacts((p) =>
      p.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
    )
  }, [])
  const deleteContact = useCallback((id: string) => {
    setContacts((p) => p.filter((c) => c.id !== id))
  }, [])

  // ---- emails (почты) ----
  const addEmail: StoreValue['addEmail'] = useCallback((e) => {
    setEmails((p) => [{ id: uid(), updatedAt: Date.now(), ...e }, ...p])
  }, [])
  const updateEmail: StoreValue['updateEmail'] = useCallback((id, patch) => {
    setEmails((p) =>
      p.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)),
    )
  }, [])
  const deleteEmail = useCallback((id: string) => {
    setEmails((p) => p.filter((e) => e.id !== id))
  }, [])

  // ---- employees (сотрудники / доступы) ----
  const addEmployee: StoreValue['addEmployee'] = useCallback((e) => {
    setEmployees((p) => [{ id: uid(), updatedAt: Date.now(), ...e }, ...p])
  }, [])
  const updateEmployee: StoreValue['updateEmployee'] = useCallback((id, patch) => {
    setEmployees((p) =>
      p.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)),
    )
  }, [])
  const deleteEmployee = useCallback((id: string) => {
    setEmployees((p) => p.filter((e) => e.id !== id))
  }, [])

  // ---- calc notes ----
  const addCalcNote = useCallback((text: string) => {
    setCalcNotes((p) => [{ id: uid(), text, createdAt: Date.now() }, ...p])
  }, [])
  const updateCalcNote = useCallback((id: string, text: string) => {
    setCalcNotes((p) => p.map((c) => (c.id === id ? { ...c, text } : c)))
  }, [])
  const deleteCalcNote = useCallback((id: string) => {
    setCalcNotes((p) => p.filter((c) => c.id !== id))
  }, [])

  // ---- docs (полноценные текстовые документы вкладки «БЛОКНОТ») ----
  const addDoc: StoreValue['addDoc'] = useCallback((title: string) => {
    const id = uid()
    const now = Date.now()
    setDocs((p) => [
      { id, title: title.trim() || 'Без названия', html: '', createdAt: now, updatedAt: now },
      ...p,
    ])
    return id
  }, [])
  const updateDoc: StoreValue['updateDoc'] = useCallback((id, patch) => {
    setDocs((p) =>
      p.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
    )
  }, [])
  const deleteDoc = useCallback((id: string) => {
    setDocs((p) => p.filter((d) => d.id !== id))
  }, [])

  // ---- vault (пароли и доступы) ----
  const addVault: StoreValue['addVault'] = useCallback((v) => {
    setVault((p) => [{ id: uid(), updatedAt: Date.now(), ...v }, ...p])
  }, [])
  const updateVault: StoreValue['updateVault'] = useCallback((id, patch) => {
    setVault((p) =>
      p.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: Date.now() } : v)),
    )
  }, [])
  const deleteVault = useCallback((id: string) => {
    setVault((p) => p.filter((v) => v.id !== id))
  }, [])

  // ---- prompts (сохранённые промты) ----
  const addPrompt: StoreValue['addPrompt'] = useCallback((pr) => {
    const now = Date.now()
    const id = uid()
    setPrompts((p) => [{ id, createdAt: now, updatedAt: now, ...pr }, ...p])
    return id
  }, [])
  const updatePrompt: StoreValue['updatePrompt'] = useCallback((id, patch) => {
    setPrompts((p) =>
      p.map((pr) => (pr.id === id ? { ...pr, ...patch, updatedAt: Date.now() } : pr)),
    )
  }, [])
  const deletePrompt = useCallback((id: string) => {
    setPrompts((p) => p.filter((pr) => pr.id !== id))
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      days,
      loaded,
      syncStatus,
      getDay,
      updateDayInput,
      submitDay,
      resetDay,
      deleteDay,
      addManualDay,
      notes,
      addNote,
      updateNote,
      deleteNote,
      tools,
      addTool,
      updateTool,
      deleteTool,
      sites,
      addSite,
      updateSite,
      deleteSite,
      bots,
      addBot,
      updateBot,
      deleteBot,
      contacts,
      addContact,
      updateContact,
      deleteContact,
      emails,
      addEmail,
      updateEmail,
      deleteEmail,
      employees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      calcNotes,
      addCalcNote,
      updateCalcNote,
      deleteCalcNote,
      docs,
      addDoc,
      updateDoc,
      deleteDoc,
      vault,
      addVault,
      updateVault,
      deleteVault,
      prompts,
      addPrompt,
      updatePrompt,
      deletePrompt,
    }),
    [
      days,
      loaded,
      syncStatus,
      getDay,
      updateDayInput,
      submitDay,
      resetDay,
      deleteDay,
      addManualDay,
      notes,
      addNote,
      updateNote,
      deleteNote,
      tools,
      addTool,
      updateTool,
      deleteTool,
      sites,
      addSite,
      updateSite,
      deleteSite,
      bots,
      addBot,
      updateBot,
      deleteBot,
      contacts,
      addContact,
      updateContact,
      deleteContact,
      emails,
      addEmail,
      updateEmail,
      deleteEmail,
      employees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      calcNotes,
      addCalcNote,
      updateCalcNote,
      deleteCalcNote,
      docs,
      addDoc,
      updateDoc,
      deleteDoc,
      vault,
      addVault,
      updateVault,
      deleteVault,
      prompts,
      addPrompt,
      updatePrompt,
      deletePrompt,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/** Производные рассчитанные дни (память по days). */
export function useComputedDays() {
  const { days } = useStore()
  return useMemo(() => days.map(computeDay), [days])
}

export { uid, addDays, parseISO, toISO }
