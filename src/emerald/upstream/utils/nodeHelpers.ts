import type { NodeData, TrafficLimitType } from '@emerald/stores/nodes'
import type { RecordFormat } from '@emerald/utils/recordHelper'
import { formatDateTime } from '@emerald/utils/helper'
import { formatPrice, formatPriceWithCycle, getDaysUntilExpired, getExpireStatus, getExpireTextClass, parseTags } from '@emerald/utils/tagHelper'

export interface PriceTagItem {
  text: string
  highlight?: boolean
}

export function hasMeasurement(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function hasHistoryMeasurement(records: Array<Partial<RecordFormat>>, keys: Array<keyof RecordFormat>): boolean {
  return records.some(record => keys.some(key => hasMeasurement(record[key])))
}

/** A missing node measurement makes the whole subtotal unknown. */
export function sumNodeMetric(nodes: NodeData[], key: keyof NodeData): number {
  if (!nodes.length || nodes.some(node => typeof node[key] !== 'number' || !Number.isFinite(node[key]))) return Number.NaN
  return nodes.reduce((sum, node) => sum + (node[key] as number), 0)
}

/** Retain an explicit offline gap instead of displaying the last online sample as current. */
export function appendLiveRecord(records: RecordFormat[], uuid: string, record: RecordFormat | null, now: number): RecordFormat[] {
  if (record) return [...records, record].slice(-150)
  const previous = records.at(-1)
  if (!previous) return records
  const gap = Object.fromEntries(Object.keys(previous).map(key => [key, null])) as unknown as RecordFormat
  gap.client = uuid
  gap.time = new Date(now).toISOString()
  return [...records, gap].slice(-150)
}

export function hasRegion(region: string | null | undefined): boolean {
  return Boolean(region?.trim())
}

export function calculateTrafficUsed(upload: number, download: number, type: TrafficLimitType): number {
  switch (type) {
    case 'up': return upload
    case 'down': return download
    case 'min': return Math.min(upload, download)
    case 'max': return Math.max(upload, download)
    case 'sum':
    default: return upload + download
  }
}

export function showTrafficProgress(node: NodeData): boolean {
  return node.traffic_limit > 0
}

export function getTrafficUsed(node: NodeData): number {
  if (node.billable_traffic_used !== undefined) return node.billable_traffic_used
  const { net_total_up, net_total_down, traffic_limit_type } = node
  return calculateTrafficUsed(net_total_up, net_total_down, traffic_limit_type)
}

export function getTrafficUsedPercentage(node: NodeData): number {
  if (!Number.isFinite(node.traffic_limit) || node.traffic_limit <= 0)
    return NaN
  const used = getTrafficUsed(node)
  return Math.min((used / node.traffic_limit) * 100, 100)
}

export function getPriceTags(node: NodeData, lang: 'zh-CN' | 'en-US'): PriceTagItem[] {
  const tags: PriceTagItem[] = []
  const days = getDaysUntilExpired(node.expired_at)
  const status = getExpireStatus(node.expired_at)
  const priceText = formatPriceWithCycle(node.price, node.billing_cycle, node.currency, lang)
  if (Number.isFinite(node.price))
    tags.push({ text: Number.isFinite(node.billing_cycle) ? priceText : formatPrice(node.price, node.currency, lang) })
  if (!node.expired_at || !Number.isFinite(new Date(node.expired_at).getTime())) return tags
  if (status === 'long_term')
    tags.push({ text: lang === 'zh-CN' ? '长期' : 'Long-term' })
  else if (lang === 'zh-CN')
    tags.push({ text: `${days >= 0 ? '+' : ''}${days}天`, highlight: true })
  else
    tags.push({ text: `${days >= 0 ? '+' : ''}${days}d`, highlight: true })
  return tags
}

export function getRemainingTimeTagClass(node: NodeData): string {
  if (node.price === 0)
    return ''
  return getExpireTextClass(node.expired_at)
}

export function getCustomTags(node: NodeData): string[] {
  return parseTags(node.tags).map(t => t.text)
}

export function formatOfflineTime(node: NodeData): string {
  return formatDateTime(node.time)
}

export function getMemPercentage(node: NodeData): number {
  return Number.isFinite(node.ram) && node.mem_total > 0 ? node.ram / node.mem_total * 100 : NaN
}

export function getDiskPercentage(node: NodeData): number {
  return Number.isFinite(node.disk) && node.disk_total > 0 ? node.disk / node.disk_total * 100 : NaN
}
