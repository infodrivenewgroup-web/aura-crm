import { proxyToDyxless, readJson } from '@/lib/search/dyxless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/balance → /query/balance (баланс и таблица цен)
export async function POST(req: Request) {
  const body = await readJson(req)
  return proxyToDyxless({ path: '/query/balance', method: 'POST', body })
}
