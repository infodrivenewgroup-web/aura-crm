import type { Metadata } from 'next'
import { VpnControlCenter } from '@/components/vpn/vpn-control-center'

export const metadata: Metadata = {
  title: 'Личный VPN-центр',
  description:
    'Удобная панель управления личным VPN для семьи и своих устройств: инструкции по подключению, добавление устройств и доступ к панели Firezone.',
}

export default function VpnPage() {
  return <VpnControlCenter />
}
