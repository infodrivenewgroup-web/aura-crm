"use client"

import { LayoutDashboard, Wallet } from "lucide-react"
import { MoscowClock } from "@/components/crm/moscow-clock"
import { Button } from "@/components/ui/button"
import { useSalesStats } from "@/hooks/use-sales-stats"
import type { TabId } from "@/components/crm/tabs-config"
import { AnalyticsSection } from "@/components/crm/home/analytics/analytics-section"
import { SyncStatusCard } from "@/components/crm/home/sync-status-card"
import { NavGrid } from "@/components/crm/home/nav-grid"

export function HomeDashboard({ onNavigate }: { onNavigate: (id: TabId) => void }) {
  const { stats, error, isLoading } = useSalesStats()

  return (
    <div className="flex flex-col gap-6">
      {/* Шапка главной */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LayoutDashboard className="size-6 text-[color:var(--primary)]" />
            Главная
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Сводка продаж по двум кассам и техническое состояние системы. Данные
            обновляются в реальном времени.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onNavigate("balance")}>
            <Wallet className="size-4" /> Открыть баланс
          </Button>
          <MoscowClock />
        </div>
      </div>

      {/* Аналитические блоки по входящим заявкам: дни / недели / месяцы */}
      <AnalyticsSection />

      {/* Техническое состояние синхронизации */}
      <SyncStatusCard stats={stats} error={error} isLoading={isLoading} />

      {/* Навигация по разделам */}
      <NavGrid onNavigate={onNavigate} />
    </div>
  )
}
