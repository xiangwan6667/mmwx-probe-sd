import type { ProbeServer } from './types'

export type TrafficRange = 'period' | 'recent7'

function finite(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function billableTraffic(server: ProbeServer): number | undefined {
  const used = finite(server.traffic_used)
  if (used !== undefined) return used
  // traffic_used_total is the raw U + D, not the adjusted billable amount.
  const adjustment = finite(server.traffic_adjustment)
  if (adjustment === undefined) return undefined
  const up = finite(server.traffic_used_up)
  const down = finite(server.traffic_used_down)
  let raw: number | undefined
  switch (server.traffic_stats_mode) {
    case 'upload': raw = up; break
    case 'download': raw = down; break
    case 'both': raw = up !== undefined && down !== undefined ? up + down : undefined; break
    case 'max': raw = up !== undefined && down !== undefined ? Math.max(up, down) : undefined; break
  }
  return raw === undefined ? undefined : Math.max(0, raw + adjustment)
}

/** Cycle directions, adjusted usage and live NIC speeds have independent scopes. */
export function summarizeTraffic(servers: ProbeServer[]) {
  const sum = (values: (number | undefined)[]): number =>
    values.some(value => finite(value) === undefined)
      ? NaN : values.reduce<number>((total, value) => total + value!, 0)
  if (!servers.length) return { uplink: NaN, downlink: NaN, used: NaN, uploadSpeed: NaN, downloadSpeed: NaN }
  return {
    uplink: sum(servers.map(server => server.traffic_used_up)),
    downlink: sum(servers.map(server => server.traffic_used_down)),
    used: sum(servers.map(billableTraffic)),
    uploadSpeed: sum(servers.filter(server => server.online).map(server => server.upload_speed)),
    downloadSpeed: sum(servers.filter(server => server.online).map(server => server.download_speed)),
  }
}

/** Billing totals use host-adjusted usage, never raw directional or NIC counters. */
export function summarizeBillingTraffic(nodes: ReadonlyArray<{
  billable_traffic_used?: number;
  traffic_limit?: number;
}>) {
  const sum = (key: 'billable_traffic_used' | 'traffic_limit'): number =>
    !nodes.length || nodes.some(node => finite(node[key]) === undefined || node[key]! < 0)
      ? NaN : nodes.reduce((total, node) => total + node[key]!, 0)
  const used = sum('billable_traffic_used')
  const limit = sum('traffic_limit')
  return { used, limit, remaining: Math.max(0, limit - used) }
}

export function hasTrafficPeriod(server: ProbeServer): boolean {
  return Boolean(server.period_start && server.period_end)
}

export function trafficUsageLabel(server: ProbeServer): string {
  if (
    server.traffic_used_scope === 'configured_period' ||
    hasTrafficPeriod(server)
  ) {
    return '本周期计费用量'
  }
  if (server.traffic_used_scope === 'counter_since_reset') {
    return '计数器重置以来计费用量'
  }
  return '当前计费用量'
}

export function trafficSourceLabel(server: ProbeServer): string | undefined {
  if (server.traffic_source === 'system') return '系统网卡'
  if (server.traffic_source === 'xray') return 'Xray 节点'
  return undefined
}

export function trafficModeLabel(server: ProbeServer): string | undefined {
  switch (server.traffic_stats_mode) {
    case 'both':
      return '上行 + 下行'
    case 'upload':
      return '仅上行'
    case 'download':
      return '仅下行'
    case 'max':
      return '上/下行取较大值'
    default:
      return undefined
  }
}

export function trafficRuleLabel(server: ProbeServer): string {
  const parts = [trafficSourceLabel(server), trafficModeLabel(server)].filter(
    (value): value is string => Boolean(value)
  )
  return parts.length > 0 ? parts.join(' · ') : '主控计费口径'
}

export function trafficFormulaLabel(server: ProbeServer): string | undefined {
  if (
    server.traffic_used_up === undefined ||
    server.traffic_used_down === undefined
  ) {
    return undefined
  }
  const mode = trafficModeLabel(server)
  if (!mode) return undefined
  return server.traffic_adjustment !== undefined
    ? `${mode} + 对账调整`
    : mode
}

export function bootTraffic(server: ProbeServer): {
  uplink?: number
  downlink?: number
} {
  return {
    uplink: server.boot_traffic_up ?? server.cumulative_up,
    downlink: server.boot_traffic_down ?? server.cumulative_down,
  }
}

export function dailyTrafficRows(
  server: ProbeServer,
  range: TrafficRange
): NonNullable<ProbeServer['daily_traffic']> {
  const rows = [...(server.daily_traffic || [])].sort((left, right) =>
    left.date.localeCompare(right.date)
  )
  if (
    range === 'period' &&
    server.period_start &&
    server.period_end
  ) {
    return rows.filter(
      (row) =>
        row.date >= server.period_start! && row.date < server.period_end!
    )
  }
  return rows.slice(-7)
}
