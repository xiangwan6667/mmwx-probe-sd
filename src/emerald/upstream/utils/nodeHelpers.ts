import type { NodeData, TrafficLimitType } from '@emerald/stores/nodes'
import { formatDateTime } from '@emerald/utils/helper'
import { formatPriceWithCycle, getDaysUntilExpired, getExpireStatus, getExpireTextClass, parseTags } from '@emerald/utils/tagHelper'

export interface PriceTagItem {
  text: string
  highlight?: boolean
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
  if (Number.isFinite(node.price) && Number.isFinite(node.billing_cycle) && node.price !== 0)
    tags.push({ text: priceText })
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
