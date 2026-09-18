'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/crm/modal'
import {
  AD_CAMPAIGNS,
  CASHIERS,
  SIMPLE_SITE_CATEGORIES,
  type AdCampaignKey,
  type AdSiteItem,
  type CashierName,
  type SiteCategory,
} from '@/lib/types'
import {
  CreditCard,
  ExternalLink,
  Globe,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function normalizeUrl(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`
  return null
}

/** Индивидуальный профессиональный цвет для каждой рекламной компании. */
const CAMPAIGN_COLORS: Record<AdCampaignKey, string> = {
  hollandia: '#2563eb',
  riagroup: '#0d9488',
  parav0aspekt: '#d97706',
  tahirhusnutdinoff: '#e11d48',
  timuriskarinov: '#0891b2',
}

function campaignOrder(key: AdCampaignKey | ''): number {
  if (!key) return Number.MAX_SAFE_INTEGER
  return AD_CAMPAIGNS.find((c) => c.key === key)?.index ?? Number.MAX_SAFE_INTEGER
}

function CampaignBadge({ campaign }: { campaign: AdCampaignKey | '' }) {
  if (!campaign) return <span className="text-muted-foreground">—</span>
  const c = AD_CAMPAIGNS.find((x) => x.key === campaign)
  const color = CAMPAIGN_COLORS[campaign]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}1f` }}
    >
      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {c ? `№${c.index} · ${c.label}` : campaign}
    </span>
  )
}

function SiteCell({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const url = normalizeUrl(value)
  if (url)
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-[color:var(--info)] hover:underline"
      >
        {value}
        <ExternalLink className="size-3.5 shrink-0" />
      </a>
    )
  return <span className="font-medium">{value}</span>
}

// ===== Подразделы вкладки «Сайты» =====
type SubKey = 'a' | 'b' | SiteCategory
const SUBSECTIONS: { key: SubKey; label: string; short: string }[] = [
  { key: 'a', label: 'Рекламные сайты А', short: 'Сайты А' },
  { key: 'b', label: 'Рекламные сайты Б', short: 'Сайты Б' },
  ...SIMPLE_SITE_CATEGORIES.map((c) => ({
    key: c.key as SubKey,
    label: c.label,
    short: c.label,
  })),
]

const EMPTY_AD = {
  siteA: '',
  siteB: '',
  campaign: '' as AdCampaignKey | '',
  cashier: '' as CashierName | '',
  comment: '',
}
const EMPTY_SIMPLE = { address: '', comment: '' }

export function AdSitesTab() {
  const { sites, addSite, updateSite, deleteSite } = useStore()
  const [sub, setSub] = useState<SubKey>('a')

  // Рекламные связки «А ⇄ Б»: записи без категории считаются 'ad' (старые данные).
  const adPairs = useMemo(
    () => sites.filter((s) => !s.category || s.category === 'ad'),
    [sites],
  )
  const sortedAdPairs = useMemo(
    () => [...adPairs].sort((a, b) => campaignOrder(a.campaign) - campaignOrder(b.campaign)),
    [adPairs],
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Globe className="size-5 text-primary" />
          Сайты
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Навигация по разделам сайтов: рекламные связки, мониторинг, отзывы, салон и иные.
        </p>
      </div>

      {/* Навигационное меню подразделов */}
      <nav className="thin-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SUBSECTIONS.map((s) => {
          const active = sub === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSub(s.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          )
        })}
      </nav>

      {sub === 'a' && (
        <AdSection
          mode="a"
          pairs={sortedAdPairs}
          onAdd={(v) => addSite({ category: 'ad', ...v })}
          onUpdate={(id, v) => updateSite(id, v)}
          onDelete={deleteSite}
        />
      )}
      {sub === 'b' && (
        <AdSection
          mode="b"
          pairs={sortedAdPairs}
          onAdd={(v) => addSite({ category: 'ad', ...v })}
          onUpdate={(id, v) => updateSite(id, v)}
          onDelete={deleteSite}
        />
      )}
      {sub !== 'a' && sub !== 'b' && (
        <SimpleSection
          key={sub}
          category={sub}
          title={SUBSECTIONS.find((s) => s.key === sub)!.label}
          items={sites.filter((s) => s.category === sub)}
          onAdd={(address, comment) =>
            addSite({
              category: sub,
              siteA: address,
              siteB: '',
              campaign: '',
              cashier: '',
              comment,
            })
          }
          onUpdate={(id, address, comment) => updateSite(id, { siteA: address, comment })}
          onDelete={deleteSite}
        />
      )}
    </div>
  )
}

// ============ Раздел рекламных связок (А или Б) ============
function AdSection({
  mode,
  pairs,
  onAdd,
  onUpdate,
  onDelete,
}: {
  mode: 'a' | 'b'
  pairs: AdSiteItem[]
  onAdd: (v: typeof EMPTY_AD) => void
  onUpdate: (id: string, v: typeof EMPTY_AD) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_AD })

  function openAdd() {
    setEditingId(null)
    setForm({ ...EMPTY_AD })
    setOpen(true)
  }
  function openEdit(s: AdSiteItem) {
    setEditingId(s.id)
    setForm({
      siteA: s.siteA,
      siteB: s.siteB,
      campaign: s.campaign,
      cashier: s.cashier ?? '',
      comment: s.comment,
    })
    setOpen(true)
  }
  function save() {
    if (!form.siteA.trim() && !form.siteB.trim()) return
    const cleaned = {
      siteA: form.siteA.trim(),
      siteB: form.siteB.trim(),
      campaign: form.campaign,
      cashier: form.cashier,
      comment: form.comment.trim(),
    }
    if (editingId) onUpdate(editingId, cleaned)
    else onAdd(cleaned)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {mode === 'a'
            ? 'Список рекламных сайтов «А» с актуальным сайтом «Б» и рекламной компанией.'
            : 'Список платёжных сайтов «Б» с привязанными рекламными сайтами «А» и кассой.'}
        </p>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="size-4" /> Добавить сайт
        </Button>
      </div>

      {pairs.length === 0 ? (
        <EmptyState text="Связок сайтов пока нет." />
      ) : (
        <div className="thin-scroll overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                {mode === 'a' ? (
                  <>
                    <th className="px-4 py-3">Сайт «А» (реклама)</th>
                    <th className="px-4 py-3">Актуальный сайт «Б»</th>
                    <th className="px-4 py-3">Рекл. компания</th>
                    <th className="px-4 py-3">Касса</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3">Сайт «Б» (оплата)</th>
                    <th className="px-4 py-3">Рекламные сайты «А»</th>
                    <th className="px-4 py-3">Касса</th>
                    <th className="px-4 py-3">Рекл. компания</th>
                  </>
                )}
                <th className="px-4 py-3">Комментарий</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((s) => (
                <tr key={s.id} className="border-b border-border/60 align-top">
                  {mode === 'a' ? (
                    <>
                      <td className="px-4 py-3"><SiteCell value={s.siteA} /></td>
                      <td className="px-4 py-3"><SiteCell value={s.siteB} /></td>
                      <td className="px-4 py-3"><CampaignBadge campaign={s.campaign} /></td>
                      <td className="px-4 py-3"><CashierTag cashier={s.cashier} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3"><SiteCell value={s.siteB} /></td>
                      <td className="px-4 py-3"><SiteCell value={s.siteA} /></td>
                      <td className="px-4 py-3"><CashierTag cashier={s.cashier} /></td>
                      <td className="px-4 py-3"><CampaignBadge campaign={s.campaign} /></td>
                    </>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">{s.comment || '—'}</td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => openEdit(s)} onDelete={() => onDelete(s.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={editingId ? 'Редактирование сайта' : 'Новый сайт'}
        description="Заполните карточку сайта и сохраните."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Сайт «А» — рекламный">
            <Input
              value={form.siteA}
              onChange={(e) => setForm((f) => ({ ...f, siteA: e.target.value }))}
              placeholder="example-ads.ru"
              autoFocus
            />
          </Field>
          <Field label="Сайт «Б» — платёжный">
            <Input
              value={form.siteB}
              onChange={(e) => setForm((f) => ({ ...f, siteB: e.target.value }))}
              placeholder="pay-example.ru"
            />
          </Field>
          <Field label="Рекламная компания">
            <CampaignSelect value={form.campaign} onChange={(v) => setForm((f) => ({ ...f, campaign: v }))} />
          </Field>
          <Field label="Касса">
            <CashierSelect value={form.cashier} onChange={(v) => setForm((f) => ({ ...f, cashier: v }))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Комментарий">
              <Input
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="заметка по сайту"
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
          <Button onClick={save}>
            <Plus className="size-4" /> {editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ============ Простой раздел: адрес + комментарий ============
function SimpleSection({
  category,
  title,
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  category: SiteCategory
  title: string
  items: AdSiteItem[]
  onAdd: (address: string, comment: string) => void
  onUpdate: (id: string, address: string, comment: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_SIMPLE })

  function openAdd() {
    setEditingId(null)
    setForm({ ...EMPTY_SIMPLE })
    setOpen(true)
  }
  function openEdit(s: AdSiteItem) {
    setEditingId(s.id)
    setForm({ address: s.siteA, comment: s.comment })
    setOpen(true)
  }
  function save() {
    if (!form.address.trim() && !form.comment.trim()) return
    if (editingId) onUpdate(editingId, form.address.trim(), form.comment.trim())
    else onAdd(form.address.trim(), form.comment.trim())
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {`Список «${title}»: адрес сайта и комментарий.`}
        </p>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="size-4" /> Добавить сайт
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState text="В этом разделе пока нет сайтов." />
      ) : (
        <div className="thin-scroll overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="w-1/2 px-4 py-3">Адрес сайта</th>
                <th className="w-1/2 px-4 py-3">Комментарий</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-border/60 align-top">
                  <td className="px-4 py-3"><SiteCell value={s.siteA} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{s.comment || '—'}</td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => openEdit(s)} onDelete={() => onDelete(s.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={editingId ? 'Редактирование сайта' : 'Новый сайт'}
        description={title}
      >
        <div className="flex flex-col gap-4">
          <Field label="Адрес сайта">
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="example.ru"
              autoFocus
            />
          </Field>
          <Field label="Комментарий">
            <Textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="комментарий по сайту"
              rows={4}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
          <Button onClick={save}>
            <Plus className="size-4" /> {editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-2">
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

function CashierTag({ cashier }: { cashier: CashierName | '' }) {
  if (!cashier) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--info)]/15 px-2 py-0.5 text-xs font-medium text-[color:var(--info)]">
      <CreditCard className="size-3" />
      {cashier}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center">
      <Globe className="size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{text}</p>
      <p className="mt-1 text-xs text-muted-foreground">Нажмите «Добавить сайт», чтобы создать запись.</p>
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

function CampaignSelect({
  value,
  onChange,
}: {
  value: AdCampaignKey | ''
  onChange: (v: AdCampaignKey | '') => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AdCampaignKey | '')}
      className="h-9 w-full rounded-lg border border-input bg-background/40 px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
      aria-label="Рекламная компания"
    >
      <option value="">— не выбрано —</option>
      {AD_CAMPAIGNS.map((c) => (
        <option key={c.key} value={c.key}>
          №{c.index} · {c.label}
        </option>
      ))}
    </select>
  )
}

function CashierSelect({
  value,
  onChange,
}: {
  value: CashierName | ''
  onChange: (v: CashierName | '') => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CashierName | '')}
      className="h-9 w-full rounded-lg border border-input bg-background/40 px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
      aria-label="Касса"
    >
      <option value="">— не выбрано —</option>
      {CASHIERS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}
