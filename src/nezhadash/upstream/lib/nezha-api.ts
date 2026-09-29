// MMWX adaptation (2026-09-29): host data/theme/router integration; see licenses/NezhaDash-NOTICE.md.
import type { MetricPeriod, MetricType, ServerMetricsResponse, ServiceResponse } from '../types/nezha-api';
import { getProbe } from '../../bridge';
import { toMonitor, toNezhaGroups, type ProbeSeriesResponse } from '../../adapter';
import { effectiveProbeRange, probeRangeOptions } from '../../../probe-ranges';

export const fetchServerGroup = async () => toNezhaGroups(getProbe());
export const fetchLoginUser = async () => ({ success: true, data: { id: 0, username: '', password: '', created_at: '', updated_at: '' } });
export const fetchService = async (): Promise<ServiceResponse> => ({ success: true, data: { services: {}, cycle_transfer_stats: {} } });
export const fetchSetting = async () => ({ success: true, data: { config: { debug: false, language: 'zh-CN', site_name: getProbe().title || '服务器状态', user_template: 'Nezha', admin_template: '', custom_code: '' }, version: '', tsdb_enabled: true } });
export type MonitorPeriod = MetricPeriod;
const requests = new Map<string, { at: number; request: Promise<any> }>();
async function series(id: number, period: string, system = false) {
  const data = getProbe();
  if (!Number.isSafeInteger(id) || !data.servers?.[id]) throw new Error('服务器不存在');
  const range = effectiveProbeRange(period, probeRangeOptions(data.history_days));
  const url = `/api/series?server=${id}&range=${range}${system ? '&metric=system' : '&all=1'}`;
  const cached = requests.get(url);
  if (cached && Date.now() - cached.at < 5000) return cached.request;
  const request = fetch(url).then(async response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json() as ProbeSeriesResponse & { series?: Record<string, {t:number;value:number}[]> };
    if (!body.success) throw new Error('历史数据暂不可用');
    return body;
  }).catch(error => { requests.delete(url); throw error; });
  requests.set(url, { at: Date.now(), request });
  return request;
}
export const fetchMonitor = async (id: number, period: MonitorPeriod = '24h') => {
  const result: ProbeSeriesResponse = await series(id, period);
  return toMonitor(id, getProbe().servers?.[id]?.name || `服务器 ${id + 1}`, result);
};
export const fetchServerMetrics = async (id: number, metric: MetricType, period: MetricPeriod = '24h'): Promise<ServerMetricsResponse> => {
  // Only documented public system series are mapped; unsupported metrics stay empty.
  const fields: Partial<Record<MetricType, string>> = { tcp_conn: 'tcp_connections', udp_conn: 'udp_connections' };
  const field = fields[metric];
  const body = field ? await series(id, period, true) : null;
  return { success: true, data: { server_id: id, server_name: getProbe().servers?.[id]?.name || '', metric,
    data_points: (body?.series?.[field!] || []).filter((point: {t:number;value:number}) => Number.isFinite(point.t) && Number.isFinite(point.value)).map((point: {t:number;value:number}) => ({ ts: point.t * 1000, value: point.value })) } };
};
