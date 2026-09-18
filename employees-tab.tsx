'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import type { EmployeeItem, EmployeeStatus } from '@/lib/types'
import { Modal } from '@/components/crm/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  BadgeCheck,
  CreditCard,
  KeyRound,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'

interface FormState {
  fullName: string
  position: string
  phone: string
  salaryCard: string
  crmAccess: string
  status: EmployeeStatus
}

const EMPTY_FORM: FormState = {
  fullName: '',
  position: '',
  phone: '',
  salaryCard: '',
  crmAccess: '',
  status: 'working',
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const working = status === 'working'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        working
          ? 'bg-[color:var(--positive)]/15 text-[color:var(--positive)]'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          working
            ? 'bg-[color:var(--positive)]'
            : 'bg-muted-foreground/60',
        )}
      />
      {working ? 'Работает' : 'Не работает'}
    </span>
  )
}

export function EmployeesTab() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useStore()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const sorted = useMemo(
    () =>
      [...employees].sort((a, b) => {
        // Работающие выше, затем по ФИО
        if (a.status !== b.status) return a.status === 'working' ? -1 : 1
        return a.fullName.localeCompare(b.fullName, 'ru')
      }),
    [employees],
  )

  const workingCount = employees.filter((e) => e.status === 'working').length

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(e: EmployeeItem) {
    setEditingId(e.id)
    setForm({
      fullName: e.fullName,
      position: e.position,
      phone: e.phone,
      salaryCard: e.salaryCard,
      crmAccess: e.crmAccess,
      status: e.status,
    })
    setOpen(true)
  }

  function save() {
    if (!form.fullName.trim()) return
    const payload = {
      fullName: form.fullName.trim(),
      position: form.position.trim(),
      phone: form.phone.trim(),
      salaryCard: form.salaryCard.trim(),
      crmAccess: form.crmAccess.trim(),
      status: form.status,
    }
    if (editingId) updateEmployee(editingId, payload)
    else addEmployee(payload)
    setOpen(false)
  }

  function toggleStatus(e: EmployeeItem) {
    updateEmployee(e.id, {
      status: e.status === 'working' ? 'not_working' : 'working',
    })
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Users className="size-5 text-primary" />
            Сотрудники/Доступы
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ФИО, должность, контакты, карта для зарплаты и доступы CRM. Всего:{' '}
            {employees.length} · работают: {workingCount}.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" /> Добавить сотрудника
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-12 text-center">
          <UserRound className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Сотрудников пока нет. Нажмите «Добавить сотрудника», чтобы внести
            данные.
          </p>
        </div>
      ) : (
        <>
          {/* Таблица для ПК: все данные умещаются по ширине без прокрутки */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">ФИО</th>
                  <th className="px-3 py-2.5 font-semibold">Должность</th>
                  <th className="px-3 py-2.5 font-semibold">Телефон</th>
                  <th className="px-3 py-2.5 font-semibold">Карта (ЗП)</th>
                  <th className="px-3 py-2.5 font-semibold">Доступы CRM</th>
                  <th className="px-3 py-2.5 font-semibold">Статус</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border/60 align-top last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-3 font-medium text-foreground">
                      <span className="block break-words">{e.fullName}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <span className="block break-words">
                        {e.position || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block break-words font-mono text-[13px] tabular-nums text-foreground">
                        {e.phone || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block break-words font-mono text-[13px] tabular-nums text-foreground">
                        {e.salaryCard || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <span className="block break-words">
                        {e.crmAccess || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(e)}
                        title="Нажмите, чтобы изменить статус"
                        className="cursor-pointer"
                      >
                        <StatusBadge status={e.status} />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Редактировать"
                          onClick={() => openEdit(e)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить"
                          onClick={() => deleteEmployee(e.id)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-[color:var(--negative)]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Карточки для планшета/телефона */}
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {sorted.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {e.fullName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {e.position || '—'}
                    </p>
                  </div>
                  <button type="button" onClick={() => toggleStatus(e)}>
                    <StatusBadge status={e.status} />
                  </button>
                </div>
                <dl className="mt-3 grid gap-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="break-all font-mono text-[13px] tabular-nums">
                      {e.phone || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="break-all font-mono text-[13px] tabular-nums">
                      {e.salaryCard || '—'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <KeyRound className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="break-words">{e.crmAccess || '—'}</span>
                  </div>
                </dl>
                <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="xs" onClick={() => openEdit(e)}>
                    <Pencil className="size-3" /> изменить
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => deleteEmployee(e.id)}
                    className="text-[color:var(--negative)] hover:text-[color:var(--negative)]"
                  >
                    <Trash2 className="size-3" /> удалить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Изменить сотрудника' : 'Новый сотрудник'}
        description="Заполните данные сотрудника и доступы CRM"
      >
        <div className="grid gap-4">
          <Field label="ФИО сотрудника" icon={UserRound}>
            <Input
              value={form.fullName}
              onChange={(ev) => set('fullName', ev.target.value)}
              placeholder="Иванов Иван Иванович"
              autoFocus
            />
          </Field>
          <Field label="Должность" icon={BadgeCheck}>
            <Input
              value={form.position}
              onChange={(ev) => set('position', ev.target.value)}
              placeholder="Менеджер по продажам"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Номер телефона" icon={Phone}>
              <Input
                value={form.phone}
                onChange={(ev) => set('phone', ev.target.value)}
                placeholder="+7 900 000-00-00"
                inputMode="tel"
              />
            </Field>
            <Field label="Карта для зарплаты" icon={CreditCard}>
              <Input
                value={form.salaryCard}
                onChange={(ev) => set('salaryCard', ev.target.value)}
                placeholder="0000 0000 0000 0000"
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Доступы CRM" icon={KeyRound}>
            <Input
              value={form.crmAccess}
              onChange={(ev) => set('crmAccess', ev.target.value)}
              placeholder="Логин / роль / разделы CRM"
            />
          </Field>
          <Field label="Статус" icon={ShieldCheck}>
            <div className="inline-flex rounded-lg border border-border bg-background/40 p-1">
              {(['working', 'not_working'] as EmployeeStatus[]).map((s) => {
                const active = form.status === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? s === 'working'
                          ? 'bg-[color:var(--positive)]/15 text-[color:var(--positive)]'
                          : 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s === 'working' ? 'Работает' : 'Не работает'}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={save} disabled={!form.fullName.trim()}>
              {editingId ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: typeof UserRound
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      {children}
    </label>
  )
}
