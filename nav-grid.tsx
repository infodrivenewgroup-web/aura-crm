"use client"

import { cn } from "@/lib/utils"
import { TAB_GROUPS, type TabId } from "@/components/crm/tabs-config"

/**
 * Профессиональная сетка навигации по разделам CRM.
 * Плитки сгруппированы по смыслу и переключают активную вкладку.
 */
export function NavGrid({ onNavigate }: { onNavigate: (id: TabId) => void }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Разделы системы</h2>
        <span className="text-[11px] text-muted-foreground">
          выберите раздел для перехода
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {TAB_GROUPS.map((g) => (
          <div key={g.group}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {g.group}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {g.tabs.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onNavigate(t.id)}
                    className={cn(
                      "group flex min-h-[76px] flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-colors",
                      "hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--primary)]/5",
                    )}
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-[color:var(--primary)]/15">
                      <Icon className="size-4 text-[color:var(--primary)]" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{t.label}</span>
                    {t.hint ? (
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {t.hint}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
