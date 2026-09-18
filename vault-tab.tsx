'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/crm/modal'
import { CopyButton } from '@/components/vpn/copy-button'
import {
  VAULT_SECTIONS,
  VAULT_MAIL_PROVIDERS,
  type VaultItem,
  type VaultSection,
  type VaultMailProviderKey,
} from '@/lib/types'
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  Server,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTION_ICON: Record<VaultSection, typeof KeyRound> = {
  mail: Mail,
  services: Server,
  other: KeyRound,
}

type FormState = {
  service: string
  login: string
  password: string
  comment: string
  mailProvider: VaultMailProviderKey
}

const EMPTY_FORM: FormState = {
  service: '',
  login: '',
  password: '',
  comment: '',
  mailProvider: VAULT_MAIL_PROVIDERS[0].key,
}

export function VaultTab() {
  const { vault, addVault, updateVault, deleteVault } = useStore()

  const [section, setSection] = useState<VaultSection>('mail')
  const [mailProvider, setMailProvider] = useState<VaultMailProviderKey>(
    VAULT_MAIL_PROVIDERS[0].key,
  )
  const [query, setQuery] = useState('')

  // Модальное окно добавления/редактирования.
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })

  const sectionDef = VAULT_SECTIONS.find((s) => s.key === section)!
  const isMail = section === 'mail'
  const q = query.trim().toLowerCase()

  // Записи текущего раздела, затем фильтрация по подразделу (для почты) и поиску.
  const visible = useMemo(() => {
    const sectionItems = vault.filter((v) => v.section === section)
    const match = (v: VaultItem) =>
      [v.service, v.login, v.comment].some((field) =>
        field.toLowerCase().includes(q),
      )
    if (isMail) {
      // Без поиска — только выбранный провайдер. С поиском — по всем провайдерам.
      const base = q
        ? sectionItems
        : sectionItems.filter((v) => (v.mailProvider ?? 'other') === mailProvider)
      return q ? base.filter(match) : base
    }
    return q ? sectionItems.filter(match) : sectionItems
  }, [vault, section, mailProvider, isMail, q])

  function openAdd() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, mailProvider: isMail ? mailProvider : EMPTY_FORM.mailProvider })
    setOpen(true)
  }

  function openEdit(v: VaultItem) {
    setEditingId(v.id)
    setForm({
      service: v.service,
      login: v.login,
      password: v.password,
      comment: v.comment,
      mailProvider: v.mailProvider ?? VAULT_MAIL_PROVIDERS[0].key,
    })
    setOpen(true)
  }

  function save() {
    const service = form.service.trim()
    const login = form.login.trim()
    const password = form.password.trim()
    const comment = form.comment.trim()
    // Нужно хотя бы одно значимое поле.
    if (!service && !login && !password && !comment) return

    const payload = {
      section,
      service,
      login,
      password,
      comment,
      ...(isMail ? { mailProvider: form.mailProvider } : {}),
    }
    if (editingId) updateVault(editingId, payload)
    else addVault(payload)
    setOpen(false)
  }

  const SectionIcon = SECTION_ICON[section]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <KeyRound className="size-5 text-primary" />
          Пароли и доступы
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Безопасное хранилище логинов, паролей и доступов. Выберите раздел,
          сохраните запись и мгновенно находите нужный аккаунт через поиск.
        </p>
      </div>

      {/* Верхнеуровневые разделы */}
      <nav className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {VAULT_SECTIONS.map((s) => {
          const Icon = SECTION_ICON[s.key]
          const active = section === s.key
          const count = vault.filter((v) => v.section === s.key).length
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSection(s.key)
                setQuery('')
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-[color:var(--primary)]' : '')} />
              {s.label}
              {count > 0 ? (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[11px] tabular-nums',
                    active
                      ? 'bg-[color:var(--primary)]/20 text-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      {/* Подразделы почты — показываются только когда поиск пуст */}
      {isMail && !q ? (
        <nav className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {VAULT_MAIL_PROVIDERS.map((p) => {
            const active = mailProvider === p.key
            const count = vault.filter(
              (v) => v.section === 'mail' && (v.mailProvider ?? 'other') === p.key,
            ).length
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setMailProvider(p.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                  active
                    ? 'border-[color:var(--accent)]/50 bg-[color:var(--accent)]/15 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {p.label}
                {count > 0 ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      ) : null}

      {/* Поиск + добавление */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по почте, сайту, сервису или комментарию…"
            className="pl-9 pr-9"
            inputMode="search"
          />
          {query ? (
            <button
              type="button"
              aria-label="Очистить поиск"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="size-4" /> Записать доступ
        </Button>
      </div>

      {/* Список записей */}
      {visible.length === 0 ? (
        <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
          <SectionIcon className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {q ? 'Ничего не найдено' : 'Записей пока нет'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {q
              ? 'Измените запрос поиска или очистите фильтр.'
              : 'Нажмите «Записать доступ», чтобы сохранить логин и пароль.'}
          </p>
        </div>
      ) : (
        <>
          {/* Таблица — планшеты и ПК */}
          <div className="thin-scroll hidden overflow-x-auto rounded-2xl border border-border bg-card lg:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Сайт / сервис</th>
                  <th className="px-4 py-3">Логин</th>
                  <th className="px-4 py-3">Пароль</th>
                  <th className="px-4 py-3">Комментарий</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((v) => (
                  <tr key={v.id} className="border-b border-border/60 align-top">
                    <td className="px-4 py-3">
                      <span className="break-all font-medium">{v.service || '—'}</span>
                      {isMail && q ? <ProviderBadge providerKey={v.mailProvider} /> : null}
                    </td>
                    <td className="px-4 py-3">
                      <ValueWithCopy value={v.login} label="логин" />
                    </td>
                    <td className="px-4 py-3">
                      <PasswordCell value={v.password} />
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-muted-foreground">
                      {v.comment || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions onEdit={() => openEdit(v)} onDelete={() => deleteVault(v.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Карточки — телефоны и небольшие экраны */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {visible.map((v) => (
              <li key={v.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-medium">{v.service || '—'}</p>
                    {isMail && q ? <ProviderBadge providerKey={v.mailProvider} /> : null}
                  </div>
                  <RowActions onEdit={() => openEdit(v)} onDelete={() => deleteVault(v.id)} />
                </div>
                <dl className="mt-3 flex flex-col gap-2">
                  {v.login ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-xs text-muted-foreground">Логин</dt>
                      <dd className="min-w-0">
                        <ValueWithCopy value={v.login} label="логин" />
                      </dd>
                    </div>
                  ) : null}
                  {v.password ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-xs text-muted-foreground">Пароль</dt>
                      <dd className="min-w-0">
                        <PasswordCell value={v.password} />
                      </dd>
                    </div>
                  ) : null}
                  {v.comment ? (
                    <div className="border-t border-border/50 pt-2">
                      <dt className="text-xs text-muted-foreground">Комментарий</dt>
                      <dd className="mt-0.5 text-sm text-foreground/90">{v.comment}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Модальное окно добавления/редактирования */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={editingId ? 'Редактирование доступа' : 'Новый доступ'}
        description={`Раздел: ${sectionDef.label}`}
      >
        <div className="flex flex-col gap-4">
          {isMail ? (
            <Field label="Почтовый сервис (подраздел)">
              <div className="flex flex-wrap gap-1.5">
                {VAULT_MAIL_PROVIDERS.map((p) => {
                  const active = form.mailProvider === p.key
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mailProvider: p.key }))}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
                        active
                          ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          ) : null}
          <Field label={isMail ? 'Почтовый ящик / сервис' : 'Сайт или название сервиса'}>
            <Input
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
              placeholder={isMail ? 'account@example.com' : 'example.com / название сервиса'}
              autoFocus
            />
          </Field>
          <Field label="Логин / имя пользователя">
            <Input
              value={form.login}
              onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
              placeholder="логин (если отличается от почты)"
            />
          </Field>
          <Field label="Пароль / доступ">
            <Input
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="пароль или ключ доступа"
              autoComplete="off"
            />
          </Field>
          <Field label="Комментарий">
            <Textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="дополнительная информация: 2FA, привязка, заметки…"
              rows={3}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={save}>
            <Plus className="size-4" /> {editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function ProviderBadge({ providerKey }: { providerKey?: VaultMailProviderKey }) {
  const label =
    VAULT_MAIL_PROVIDERS.find((p) => p.key === (providerKey ?? 'other'))?.label ?? 'Иные'
  return (
    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-[color:var(--accent)]/15 px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--accent)]">
      <Mail className="size-3" />
      {label}
    </span>
  )
}

function ValueWithCopy({ value, label }: { value: string; label: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="truncate break-all">{value}</span>
      <CopyButton value={value} ariaLabel={`Скопировать ${label}`} className="size-7" />
    </span>
  )
}

function PasswordCell({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false)
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="truncate break-all font-mono text-[13px]">
        {revealed ? value : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? 'Скрыть пароль' : 'Показать пароль'}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-colors hover:text-foreground"
      >
        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
      <CopyButton value={value} ariaLabel="Скопировать пароль" className="size-7" />
    </span>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 justify-end gap-2">
      <button
        type="button"
        aria-label="Редактировать"
        onClick={onEdit}
        className="text-muted-foreground hover:text-primary"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Удалить"
        onClick={onDelete}
        className="text-muted-foreground hover:text-[color:var(--negative)]"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
