// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
// MMWX adaptation (2026-09-29): host data/theme/router integration; see licenses/NezhaDash-NOTICE.md.
import type { MetricPeriod, MetricType, ServerMetricsResponse, ServiceResponse } from '../types/nezha-api';
import { getProbe } from '../../bridge';
import { createRequestCache } from '../../request-cache';
import { toMonitor, toNezhaGroups, type ProbeSeriesResponse } from '../../adapter';
import { effectiveProbeRange, probeRangeOptions } from '../../../probe-ranges';
import { DEFAULT_PROBE_ICON } from '../../../document-branding';

export const fetchServerGroup = async () => toNezhaGroups(getProbe());
export const fetchLoginUser = async () => ({ success: true, data: { id: 0, username: '', password: '', created_at: '', updated_at: '' } });
export const fetchService = async (): Promise<ServiceResponse> => ({ success: true, data: { services: {}, cycle_transfer_stats: {} } });
export const fetchSetting = async () => ({ success: true, data: { config: { debug: false, language: 'zh-CN', site_name: getProbe().title || '服务器状态', site_icon: getProbe().icon?.trim() || DEFAULT_PROBE_ICON, site_desc: '', user_template: 'Nezha', admin_template: '', custom_code: '' }, private_site: false, version: '', tsdb_enabled: true } });
export type MonitorPeriod = MetricPeriod;
type SeriesBody = ProbeSeriesResponse & { series?: Record<string, {t:number;value:number}[]> };
const cachedRequest = createRequestCache<SeriesBody>();
async function series(id: number, period: string, system = false) {
  const data = getProbe();
  if (!Number.isSafeInteger(id) || !data.servers?.[id]) throw new Error('服务器不存在');
  const range = effectiveProbeRange(period, probeRangeOptions(data.history_days));
  const url = `/api/series?server=${id}&range=${range}${system ? '&metric=system' : '&all=1'}`;
  return cachedRequest(url, async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json() as SeriesBody;
    if (!body.success) throw new Error('历史数据暂不可用');
    return body;
  });
}
export const fetchMonitor = async (id: number, period: MonitorPeriod | number = '24h') => {
  const result: ProbeSeriesResponse = await series(id, typeof period === "number" ? `${period}h` : period);
  return toMonitor(id, getProbe().servers?.[id]?.name || `服务器 ${id + 1}`, result);
};
export const fetchServerMetrics = async (id: number, metric: MetricType, period: MetricPeriod = '24h'): Promise<ServerMetricsResponse> => {
  // Keep CPU in percent and memory/network in bytes, as expected by upstream charts.
  // Missing series (e.g. disk on older masters) must remain empty, never use live values.
  const fields: Partial<Record<MetricType, string>> = {
    cpu: 'cpu_pct', memory: 'mem_used', disk: 'disk_used',
    net_out_speed: 'upload_speed', net_in_speed: 'download_speed',
    tcp_conn: 'tcp_connections', udp_conn: 'udp_connections',
  };
  const field = fields[metric];
  const body = field ? await series(id, period, true) : null;
  return { success: true, data: { server_id: id, server_name: getProbe().servers?.[id]?.name || '', metric,
    data_points: (body?.series?.[field!] || []).filter((point: {t:number;value:number}) => Number.isFinite(point.t) && Number.isFinite(point.value)).map((point: {t:number;value:number}) => ({ ts: point.t * 1000, value: point.value })) } };
};

// Host settings are read-only in the public theme; component preferences stay local.
export const updateThemeSetting = async (key: string, value: unknown) => { localStorage.setItem(key, JSON.stringify(value)); };
