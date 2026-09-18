import {
  AD_CAMPAIGNS,
  type AdCampaignKey,
  type DayInput,
  type DayRecord,
  type DayComputed,
  type PeriodTotals,
} from './types'

// ====== Базовые константы расчёта ======
export const BASE_REQUEST_PRICE = 1999 // стоимость одной базовой заявки, ₽
// Стоимость одной оплаченной нереализованной заявки — также 1999 ₽.
export const PAID_UNREALIZED_PRICE = 1999
export const COMMISSION_RATE = 0.14 // комиссия кассы — 14%
export const START_DATE = '2026-06-18' // дата старта учёта

// Зарплата руководителя (РОП):
// 150 ₽ за каждую поступившую заявку (в т.ч. за каждую оплаченную
// нереализованную), КРОМЕ заявок, по которым произведён возврат,
// плюс 20% от «иных доходов».
export const ROP_PER_REQUEST = 150 // ₽ за заявку
export const ROP_OTHER_INCOME_RATE = 0.2 // доля от «иных поступлений»

/**
 * Денежное округление до копеек (2 знака) с защитой от ошибок
 * плавающей точки. Используется во ВСЕХ денежных операциях,
 * чтобы расчёты никогда не «сбивались».
 */
export function money(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Безопасное приведение пользовательского ввода к неотрицательному числу. */
export function toNumber(value: unknown): number {
  const n =
    typeof value === 'number'
      ? value
      : Number.parseFloat(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(n)) return 0
  return n
}

export function emptyAds(): Record<AdCampaignKey, number> {
  return AD_CAMPAIGNS.reduce(
    (acc, c) => {
      acc[c.key] = 0
      return acc
    },
    {} as Record<AdCampaignKey, number>,
  )
}

export function emptyInput(): DayInput {
  return {
    baseRequestsCount: 0,
    otherIncome: 0,
    paidUnrealizedCount: 0,
    refundsCount: 0,
    refundsSum: 0,
    ads: emptyAds(),
    salaries: 0,
    otherExpenses: [],
  }
}

export function emptyDay(date: string): DayRecord {
  return { date, input: emptyInput(), submitted: false, updatedAt: Date.now() }
}

/**
 * ГЛАВНАЯ ФУНКЦИЯ РАСЧЁТА.
 * По введённым пользователем данным одного дня вычисляет все
 * производные показатели строго по формулам из инструкции.
 *
 * Приход:
 *   Сумма базовых заявок = кол-во заявок × 1999 ₽
 *   Сумма опл. нереал = кол-во оплаченных нереализованных заявок × 1999 ₽
 *   Итог прихода = Сумма поступлений + Иные поступления
 *     где Сумма поступлений = Сумма базовых заявок + Сумма опл. нереал.
 *     ВАЖНО: возвраты в приходе НЕ учитываются.
 * Расход:
 *   Комиссия кассы = 14% × Сумма базовых заявок (иные поступления НЕ по кассе)
 *   Реклама = сумма по 5 компаниям
 *   ЗП РОП = 150 ₽ × (кол-во базовых заявок − возвраты)
 *           + 150 ₽ × кол-во оплаченных нереализованных заявок
 *           + 20% × Иные поступления
 *   Итого расходов = Возврат + Комиссия + Реклама + Зарплата + ЗП РОП + Прочие расходы
 *     ВАЖНО: сумма возвратов за день приплюсовывается к общему расходу.
 * Результат:
 *   Чистая прибыль = Итог прихода − Итого расходов
 */
export function computeDay(record: DayRecord): DayComputed {
  const i = record.input

  const baseRequestsCount = Math.max(0, Math.round(toNumber(i.baseRequestsCount)))
  const baseRequestsSum = money(baseRequestsCount * BASE_REQUEST_PRICE)
  const otherIncome = money(toNumber(i.otherIncome))
  // Опл. нереал: пользователь вводит КОЛИЧЕСТВО заявок, сумму считает система.
  const paidUnrealizedCount = Math.max(
    0,
    Math.round(toNumber(i.paidUnrealizedCount)),
  )
  const paidUnrealizedSum = money(paidUnrealizedCount * PAID_UNREALIZED_PRICE)
  const refundsCount = Math.max(0, Math.round(toNumber(i.refundsCount)))
  const refundsSum = money(toNumber(i.refundsSum))

  // Итоговая сумма прихода = Сумма поступлений + Иные поступления.
  // «Сумма поступлений» = базовые заявки + оплаченные нереализованные.
  // ВАЖНО: возвраты В ПРИХОДЕ НЕ УЧИТЫВАЮТСЯ (они отнесены к расходам).
  const totalIncome = money(
    baseRequestsSum + otherIncome + paidUnrealizedSum,
  )

  // Комиссия кассы = 14% от суммы ТОЛЬКО базовых заявок
  const cashCommission = money(baseRequestsSum * COMMISSION_RATE)

  const adsBreakdown = emptyAds()
  let adsTotal = 0
  for (const c of AD_CAMPAIGNS) {
    const v = money(toNumber(i.ads?.[c.key]))
    adsBreakdown[c.key] = v
    adsTotal = money(adsTotal + v)
  }

  const salaries = money(toNumber(i.salaries))

  // ЗП РОП:
  //  • 150 ₽ за каждую базовую заявку, КРОМЕ заявок с возвратом;
  //  • 150 ₽ за КАЖДУЮ оплаченную нереализованную заявку
  //    (остальные 1849 ₽ с такой заявки идут в прибыль сервиса);
  //  • плюс 20% от иных поступлений.
  const ropBaseRequests = Math.max(0, baseRequestsCount - refundsCount)
  const ropSalary = money(
    ropBaseRequests * ROP_PER_REQUEST +
      paidUnrealizedCount * ROP_PER_REQUEST +
      otherIncome * ROP_OTHER_INCOME_RATE,
  )

  const otherExpensesTotal = money(
    (i.otherExpenses ?? []).reduce((s, e) => s + toNumber(e.amount), 0),
  )

  // Итого расходов = Возврат + Комиссия + Реклама + Зарплата + ЗП РОП + Прочие.
  // ВАЖНО: сумма возвратов за день приплюсовывается к общему расходу.
  const totalExpenses = money(
    refundsSum +
      cashCommission +
      adsTotal +
      salaries +
      ropSalary +
      otherExpensesTotal,
  )

  // Чистая прибыль = итог прихода − итого расходов
  const netProfit = money(totalIncome - totalExpenses)

  // Рентабельность (чистая прибыль / приход)
  const margin = totalIncome > 0 ? money((netProfit / totalIncome) * 100) : 0

  return {
    date: record.date,
    baseRequestsCount,
    baseRequestsSum,
    otherIncome,
    paidUnrealizedCount,
    paidUnrealizedSum,
    refundsCount,
    refundsSum,
    totalIncome,
    cashCommission,
    adsTotal,
    adsBreakdown,
    salaries,
    ropSalary,
    otherExpensesTotal,
    totalExpenses,
    netProfit,
    margin,
    submitted: record.submitted,
  }
}

/** Суммирование набора рассчитанных дней в итог по периоду. */
export function sumPeriod(days: DayComputed[]): PeriodTotals {
  const adsBreakdown = emptyAds()
  const totals: PeriodTotals = {
    baseRequestsCount: 0,
    baseRequestsSum: 0,
    otherIncome: 0,
    paidUnrealizedCount: 0,
    paidUnrealizedSum: 0,
    refundsCount: 0,
    refundsSum: 0,
    totalIncome: 0,
    cashCommission: 0,
    adsTotal: 0,
    adsBreakdown,
    salaries: 0,
    ropSalary: 0,
    otherExpensesTotal: 0,
    totalExpenses: 0,
    netProfit: 0,
    margin: 0,
    daysCount: 0,
  }

  for (const d of days) {
    totals.baseRequestsCount += d.baseRequestsCount
    totals.baseRequestsSum = money(totals.baseRequestsSum + d.baseRequestsSum)
    totals.otherIncome = money(totals.otherIncome + d.otherIncome)
    totals.paidUnrealizedCount += d.paidUnrealizedCount
    totals.paidUnrealizedSum = money(
      totals.paidUnrealizedSum + d.paidUnrealizedSum,
    )
    totals.refundsCount += d.refundsCount
    totals.refundsSum = money(totals.refundsSum + d.refundsSum)
    totals.totalIncome = money(totals.totalIncome + d.totalIncome)
    totals.cashCommission = money(totals.cashCommission + d.cashCommission)
    totals.adsTotal = money(totals.adsTotal + d.adsTotal)
    for (const c of AD_CAMPAIGNS) {
      adsBreakdown[c.key] = money(adsBreakdown[c.key] + d.adsBreakdown[c.key])
    }
    totals.salaries = money(totals.salaries + d.salaries)
    totals.ropSalary = money(totals.ropSalary + d.ropSalary)
    totals.otherExpensesTotal = money(
      totals.otherExpensesTotal + d.otherExpensesTotal,
    )
    totals.totalExpenses = money(totals.totalExpenses + d.totalExpenses)
    totals.netProfit = money(totals.netProfit + d.netProfit)
    totals.daysCount += 1
  }

  totals.margin =
    totals.totalIncome > 0
      ? money((totals.netProfit / totals.totalIncome) * 100)
      : 0

  return totals
}

/** Изменение в процентах между двумя величинами (для сравнения периодов). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0
    return null // нет базы для сравнения
  }
  return money(((current - previous) / Math.abs(previous)) * 100)
}
