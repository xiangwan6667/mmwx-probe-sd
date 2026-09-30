import type { ProbePayload, ProbePingSeries } from '../types';
import { bootTraffic } from '../traffic-display';
import { toPublicNote } from './metadata';
import type { MonitorResponse, NezhaWebsocketResponse, ServerGroupResponse } from './upstream/types/nezha-api';

const measurement = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : NaN;

// Only the public MMWX payload crosses the bridge; IDs remain API array indices.
export function toNezhaData(data: ProbePayload, now = Date.now()): NezhaWebsocketResponse {
  return { now, online: data.servers?.filter(server => server.online).length ?? 0,
    servers: (data.servers ?? []).map((server, id) => {
      const traffic = bootTraffic(server);
      const load = server.loadavg?.trim().split(/\s+/).map(value => value ? Number(value) : NaN) ?? [];
      return {
        id, online: server.online, traffic_limit: measurement(server.traffic_limit), traffic_limit_type: server.traffic_stats_mode || "sum",
        name: server.name || `服务器 ${id + 1}`, public_note: toPublicNote(server),
        last_active: server.online ? new Date(now).toISOString() : '0001-01-01T00:00:00Z',
        country_code: server.region_country || (/^[a-z]{2}$/i.test(server.region || '') ? server.region! : ''),
        host: { platform: server.os || '', platform_version: server.kernel || '', cpu: server.cpu_model ? [server.cpu_model] : [], gpu: [],
          mem_total: measurement(server.mem_total), disk_total: measurement(server.disk_total), swap_total: NaN, arch: server.arch || '',
          boot_time: Number.isFinite(server.uptime) ? Math.floor(now / 1000 - server.uptime!) : NaN, version: '' },
        state: { cpu: measurement(server.cpu_pct), mem_used: measurement(server.mem_used), disk_used: measurement(server.disk_used), swap_used: NaN,
          net_in_transfer: measurement(traffic.downlink), net_out_transfer: measurement(traffic.uplink),
          net_in_speed: measurement(server.download_speed), net_out_speed: measurement(server.upload_speed), uptime: measurement(server.uptime),
          load_1: measurement(load[0]), load_5: measurement(load[1]), load_15: measurement(load[2]),
          tcp_conn_count: measurement(server.tcp_connections), udp_conn_count: measurement(server.udp_connections),
          process_count: NaN, temperatures: [], gpu: [] },
      };
    }),
  };
}
export function toNezhaGroups(_data: ProbePayload): ServerGroupResponse {
  // Geography remains on servers/flags; the master supplies no user groups.
  return { success: true, data: [] };
}
export interface ProbeSeriesResponse {
  success?: boolean; generated_at?: number; bucket_sec?: number; all_series?: ProbePingSeries[];
}
export function toMonitor(id: number, name: string, payload: ProbeSeriesResponse): MonitorResponse {
  const bucket = payload.bucket_sec || 300;
  const generated = payload.generated_at ?? Math.floor(Date.now() / 1000);
  const end = generated - generated % bucket;
  return { success: true, data: (payload.all_series || []).filter(series => series.buckets.some(point =>
    (Number.isFinite(point.ms) && point.ms >= 0) || (Number.isFinite(point.loss) && point.loss >= 0))).map((series, index) => {
    const points = series.buckets.map((point, position) => ({ ...point, time: end - (series.buckets.length - 1 - position) * bucket }));
    return { monitor_id: index, monitor_name: series.label, display_index: index, server_id: id, server_name: name,
      created_at: points.map(point => point.time * 1000), avg_delay: points.map(point => Number.isFinite(point.ms) && point.ms >= 0 ? point.ms : null), packet_loss: points.map(point => point.loss) };
  }) };
}
