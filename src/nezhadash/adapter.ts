import type { ProbePayload, ProbePingSeries } from '../types';
import { bootTraffic } from '../traffic-display';
import { toPublicNote } from './metadata';
import type { MonitorResponse, NezhaWebsocketResponse, ServerGroupResponse } from './upstream/types/nezha-api';

// Only the public MMWX payload crosses the bridge; IDs remain API array indices.
export function toNezhaData(data: ProbePayload, now = Date.now()): NezhaWebsocketResponse {
  return { now, online: data.servers?.filter(server => server.online).length ?? 0,
    servers: (data.servers ?? []).map((server, id) => {
      const traffic = bootTraffic(server);
      const load = server.loadavg?.trim().split(/\s+/).map(Number) ?? [];
      return {
        id, name: server.name || `服务器 ${id + 1}`, public_note: toPublicNote(server),
        last_active: server.online ? new Date(now).toISOString() : '0001-01-01T00:00:00Z',
        country_code: server.region_country || (/^[a-z]{2}$/i.test(server.region || '') ? server.region! : ''),
        host: { platform: server.os || '', platform_version: server.kernel || '', cpu: server.cpu_model ? [server.cpu_model] : [], gpu: [],
          mem_total: server.mem_total ?? 0, disk_total: server.disk_total ?? 0, swap_total: 0, arch: server.arch || '',
          boot_time: server.uptime === undefined ? 0 : Math.floor(now / 1000 - server.uptime), version: '' },
        state: { cpu: server.cpu_pct ?? 0, mem_used: server.mem_used ?? 0, disk_used: server.disk_used ?? 0, swap_used: 0,
          net_in_transfer: traffic.downlink ?? 0, net_out_transfer: traffic.uplink ?? 0,
          net_in_speed: server.download_speed ?? 0, net_out_speed: server.upload_speed ?? 0, uptime: server.uptime ?? 0,
          load_1: load[0] || 0, load_5: load[1] || 0, load_15: load[2] || 0,
          tcp_conn_count: server.tcp_connections ?? 0, udp_conn_count: server.udp_connections ?? 0,
          process_count: 0, temperatures: [], gpu: [] },
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
  return { success: true, data: (payload.all_series || []).filter(series => series.buckets.length > 0).map((series, index) => {
    const points = series.buckets.map((point, position) => ({ ...point, time: end - (series.buckets.length - 1 - position) * bucket }));
    return { monitor_id: index, monitor_name: series.label, display_index: index, server_id: id, server_name: name,
      created_at: points.map(point => point.time * 1000), avg_delay: points.map(point => Number.isFinite(point.ms) && point.ms >= 0 ? point.ms : null), packet_loss: points.map(point => point.loss) };
  }) };
}
