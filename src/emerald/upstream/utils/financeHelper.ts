import type { NodeData } from '@emerald/stores/nodes'

const FINANCE_CURRENCY_CONFIG = {
  AUD: { symbol: 'A$' },
  BRL: { symbol: 'R$' },
  CAD: { symbol: 'C$' },
  CHF: { symbol: 'CHF' },
  CNY: { symbol: '¥' },
  CZK: { symbol: 'Kč' },
  DKK: { symbol: 'kr' },
  EUR: { symbol: '€' },
  GBP: { symbol: '£' },
  HKD: { symbol: '$' },
  HUF: { symbol: 'Ft' },
  IDR: { symbol: 'Rp' },
  ILS: { symbol: '₪' },
  INR: { symbol: '₹' },
  ISK: { symbol: 'kr' },
  JPY: { symbol: '¥' },
  KRW: { symbol: '₩' },
  KZT: { symbol: '₸' },
  MXN: { symbol: 'Mex$' },
  MYR: { symbol: 'RM' },
  NOK: { symbol: 'kr' },
  NZD: { symbol: 'NZ$' },
  PHP: { symbol: '₱' },
  PLN: { symbol: 'zł' },
  RON: { symbol: 'lei' },
  RUB: { symbol: '₽' },
  SEK: { symbol: 'kr' },
  SGD: { symbol: 'S$' },
  THB: { symbol: '฿' },
  TRY: { symbol: '₺' },
  UAH: { symbol: '₴' },
  USD: { symbol: '$' },
  VND: { symbol: '₫' },
  ZAR: { symbol: 'R' },
} as const

export type CurrencyCode = keyof typeof FINANCE_CURRENCY_CONFIG
export const SUPPORTED_FINANCE_CURRENCIES = Object.keys(FINANCE_CURRENCY_CONFIG) as CurrencyCode[]
export const DISPLAY_FINANCE_CURRENCIES = [
  'CNY',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'HKD',
  'KRW',
  'RUB',
  'BRL',
  'INR',
  'AUD',
  'CAD',
  'SGD',
  'THB',
  'VND',
  'MYR',
  'PHP',
  'IDR',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'TRY',
  'ZAR',
  'KZT',
  'UAH',
  'CHF',
] as const satisfies readonly CurrencyCode[]
export type ExchangeRates = Partial<Record<CurrencyCode, number>>
export type ExchangeRateSource = 'cache' | 'network' | 'stale-cache' | 'default'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MONTH_DAYS = 30
const LONG_TERM_YEARS = 100

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = { CNY: 1 }

export const CURRENCY_SYMBOLS = Object.fromEntries(
  Object.entries(FINANCE_CURRENCY_CONFIG).map(([currency, config]) => [currency, config.symbol]),
) as Record<CurrencyCode, string>

const EXPLICIT_CURRENCY_ALIASES: Record<string, CurrencyCode> = {
  '$': 'USD',
  'US$': 'USD',
  'CA$': 'CAD',
  'CN¥': 'CNY',
  'RMB': 'CNY',
  'HK$': 'HKD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'CNY',
  '￥': 'CNY',
  'JP¥': 'JPY',
}
const CURRENCY_SYMBOL_ALIASES = createCurrencySymbolAliases()

export function normalizeCurrency(currency: string | null | undefined): CurrencyCode {
  const value = String(currency || 'CNY').trim().toUpperCase()

  if (isSupportedCurrency(value))
    return value

  return EXPLICIT_CURRENCY_ALIASES[value] || CURRENCY_SYMBOL_ALIASES[value] || 'CNY'
}

export function isSupportedCurrency(currency: string): currency is CurrencyCode {
  return (SUPPORTED_FINANCE_CURRENCIES as readonly string[]).includes(currency)
}

function createCurrencySymbolAliases(): Record<string, CurrencyCode> {
  const symbolEntries = Object.entries(FINANCE_CURRENCY_CONFIG).map(([currency, config]) => [
    config.symbol.trim().toUpperCase(),
    currency as CurrencyCode,
  ] as const)

  const symbolCounts = symbolEntries.reduce<Record<string, number>>((counts, [symbol]) => {
    counts[symbol] = (counts[symbol] || 0) + 1
    return counts
  }, {})

  return symbolEntries.reduce<Record<string, CurrencyCode>>((aliases, [symbol, currency]) => {
    if (symbol && symbolCounts[symbol] === 1)
      aliases[symbol] = currency

    return aliases
  }, {})
}

export function getTodayDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shouldExcludeFreeNodes(): boolean {
  const value = getLocalStorageItem('fin_exclude_free')
  return value === null ? true : value === 'true'
}

export function getStoredFinanceCurrency(): CurrencyCode {
  return normalizeCurrency(getLocalStorageItem('fin_currency') || 'CNY')
}

export function setStoredFinanceCurrency(currency: CurrencyCode): void {
  setLocalStorageItem('fin_currency', currency)
}

export function calculateTotalRemainingValueCNY(
  nodes: NodeData[],
  exchangeRates: ExchangeRates,
  excludeFreeTags = true,
  now = new Date(),
): number {
  return nodes.reduce((sum, node) => {
    if (excludeFreeTags && node.tags?.includes('白嫖中'))
      return sum

    return sum + calculateRemainingValueCNY(node, exchangeRates, now)
  }, 0)
}

export function calculateTotalValueCNY(
  nodes: NodeData[],
  exchangeRates: ExchangeRates,
  excludeFreeTags = true,
): number {
  return nodes.reduce((sum, node) => {
    if (excludeFreeTags && node.tags?.includes('白嫖中'))
      return sum

    return sum + getPriceCNY(node, exchangeRates)
  }, 0)
}

export function calculateValueCNY(
  node: NodeData,
  exchangeRates: ExchangeRates,
): number {
  return getPriceCNY(node, exchangeRates)
}

export function calculateTotalMonthlyAverageCostCNY(
  nodes: NodeData[],
  exchangeRates: ExchangeRates,
  excludeFreeTags = true,
): number {
  return nodes.reduce((sum, node) => {
    if (excludeFreeTags && node.tags?.includes('白嫖中'))
      return sum

    return sum + calculateMonthlyAverageCostCNY(node, exchangeRates)
  }, 0)
}

export function calculateMonthlyAverageCostCNY(
  node: NodeData,
  exchangeRates: ExchangeRates,
): number {
  const priceCNY = getPriceCNY(node, exchangeRates)
  if (priceCNY <= 0)
    return 0

  const billingCycle = Number(node.billing_cycle)
  if (!Number.isFinite(billingCycle) || billingCycle <= 0)
    return 0

  return priceCNY / billingCycle * MONTH_DAYS
}

export function calculateRemainingValueCNY(
  node: NodeData,
  exchangeRates: ExchangeRates,
  now = new Date(),
): number {
  if (!node.expired_at)
    return 0

  const priceCNY = getPriceCNY(node, exchangeRates)
  if (priceCNY <= 0)
    return 0

  const expiredAt = new Date(node.expired_at).getTime()
  if (!Number.isFinite(expiredAt))
    return 0

  const diffMs = expiredAt - now.getTime()
  const diffYears = diffMs / (MS_PER_DAY * 365)

  if (diffYears > LONG_TERM_YEARS)
    return priceCNY

  const billingCycle = Number(node.billing_cycle)
  const billingCycleMs = billingCycle * MS_PER_DAY
  if (diffMs > 0 && billingCycleMs > 0)
    return priceCNY * (diffMs / billingCycleMs)

  return 0
}

export function formatFinanceAmount(amount: number | null | undefined, currency: string): {
  currency: string
  symbol: string
  value: string
} {
  if (amount == null || !Number.isFinite(amount)) return { currency, symbol: '', value: '—' }
  const safeAmount = amount
  const value = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Math.abs(safeAmount) < 100000 ? 2 : 0,
    notation: Math.abs(safeAmount) >= 100000 ? 'compact' : 'standard',
  }).format(safeAmount)

  return {
    currency,
    symbol: CURRENCY_SYMBOLS[currency as CurrencyCode] || '',
    value,
  }
}

export async function getDailyExchangeRates(): Promise<{
  rates: ExchangeRates
  source: ExchangeRateSource
}> {
  return { rates: DEFAULT_EXCHANGE_RATES, source: 'default' }
}

function getPriceCNY(node: NodeData, exchangeRates: ExchangeRates): number {
  const price = Number(node.price)
  if (!Number.isFinite(price) || price <= 0)
    return 0

  const currency = normalizeCurrency(node.currency)
  if (currency === 'CNY')
    return price

  const rate = exchangeRates[currency]
  return rate && rate > 0 ? price / rate : Number.NaN
}

export async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
  }
  finally {
    window.clearTimeout(timeoutId)
  }
}

function getLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  }
  catch {
    return null
  }
}

function setLocalStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  }
  catch {
    // 缓存失败不应阻断价值计算，下一次刷新会重新尝试获取汇率。
  }
}

export function originalCurrency(currency: string | null | undefined): string {
  const value = String(currency || '').trim().toUpperCase()
  return EXPLICIT_CURRENCY_ALIASES[value] || CURRENCY_SYMBOL_ALIASES[value] || value
}

export function originalFinance(node: NodeData, now = new Date()) {
  const currency = originalCurrency(node.currency)
  const price = node.price
  const total = currency && typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : null
  const cycle = node.billing_cycle
  const validCycle = Number.isFinite(cycle) && cycle > 0
  const expiry = node.expired_at ? new Date(node.expired_at).getTime() : Number.NaN
  const remainingDays = (expiry - now.getTime()) / MS_PER_DAY
  return {
    currency: currency || '未知币种',
    total,
    monthly: total !== null && validCycle ? total / cycle * MONTH_DAYS : null,
    remaining: total === null || !Number.isFinite(remainingDays) ? null
      : remainingDays <= 0 ? 0
        : remainingDays > LONG_TERM_YEARS * 365 ? total
          : validCycle ? total * remainingDays / cycle : null,
  }
}

/** Missing values invalidate their currency subtotal instead of becoming zero. */
export function calculateFinanceGroups(nodes: NodeData[], excludeFreeTags = true, now = new Date()) {
  const groups = new Map<string, ReturnType<typeof originalFinance>>()
  for (const node of nodes) {
    if (excludeFreeTags && node.tags?.includes('白嫖中')) continue
    const entry = originalFinance(node, now)
    const group = groups.get(entry.currency)
    if (group) {
      for (const key of ['total', 'monthly', 'remaining'] as const) {
        const previous = group[key]
        const value = entry[key]
        group[key] = previous === null || value === null ? null : previous + value
      }
    }
    else groups.set(entry.currency, entry)
  }
  return [...groups.values()]
}
