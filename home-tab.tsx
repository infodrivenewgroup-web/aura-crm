"use client"

import { HomeDashboard } from "@/components/crm/home/home-dashboard"
import type { TabId } from "@/components/crm/tabs-config"

export function HomeTab({ onNavigate }: { onNavigate: (id: TabId) => void }) {
  return <HomeDashboard onNavigate={onNavigate} />
}
