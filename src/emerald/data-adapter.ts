import type { ProbePayload, ProbeServer } from '../types';
import type { NodeData } from './upstream/stores/nodes';
import type { PublicSettings } from './upstream/utils/api';
import { billableTraffic, bootTraffic } from '../traffic-display';

const measurement = (value: number | undefined): number => typeof value === 'number' && Number.isFinite(value) ? value : NaN;
const billingDays: Record<NonNullable<ProbeServer['renewal_cycle']>, number> = {
  month: 30, quarter: 90, half_year: 180, year: 365, two_year: 730, three_year: 1095, permanent: -1,
};

/** Preserve byte units and unknown values. UUIDs match the host series API indices. */
export function payloadToNodes(payload: ProbePayload): NodeData[] {
  return (payload.servers ?? []).map((server, index) => {
    const traffic = bootTraffic(server);
    const load = server.loadavg?.trim().split(/\s+/).map(value => value ? Number(value) : NaN) ?? [];
    return {
      uuid: String(index), name: server.name || `服务器 ${index + 1}`,
      cpu_name: server.cpu_model || '', virtualization: '', arch: server.arch || '',
      cpu_cores: measurement(server.cpu_cores), os: server.os || '', kernel_version: server.kernel || '',
      region: server.region_country || (/^[a-z]{2}$/i.test(server.region || '') ? server.region! : ''),
      public_remark: '', mem_total: measurement(server.mem_total), swap_total: NaN, disk_total: measurement(server.disk_total),
      weight: index, price: measurement(server.renewal_price ?? server.renewal_price_cny),
      billing_cycle: server.renewal_cycle ? billingDays[server.renewal_cycle] : NaN,
      auto_renewal: false, currency: server.renewal_price !== undefined ? (server.renewal_currency || 'CNY') : 'CNY',
      expired_at: server.expires_at || '', group: server.region || server.region_name || server.region_country || '',
      tags: '', hidden: false, billable_traffic_used: measurement(billableTraffic(server)), traffic_limit: measurement(server.traffic_limit),
      traffic_limit_type: server.traffic_stats_mode === 'upload' ? 'up' : server.traffic_stats_mode === 'download' ? 'down' : server.traffic_stats_mode === 'max' ? 'max' : 'sum',
      created_at: '', updated_at: '', online: server.online, time: '',
      cpu: measurement(server.cpu_pct), gpu: NaN, ram: measurement(server.mem_used), swap: NaN,
      load: measurement(load[0]), load5: measurement(load[1]), load15: measurement(load[2]), temp: NaN,
      disk: measurement(server.disk_used), net_in: measurement(server.download_speed), net_out: measurement(server.upload_speed),
      net_total_up: measurement(traffic.uplink), net_total_down: measurement(traffic.downlink),
      process: NaN, connections: measurement(server.tcp_connections), connections_udp: measurement(server.udp_connections),
      uptime: measurement(server.uptime),
    };
  });
}

export function createPublicSettings(payload: ProbePayload): PublicSettings {
  return {
    allow_cors: false, custom_body: '', custom_head: '', description: '',
    disable_password_login: true, oauth_enable: false, oauth_provider: null,
    ping_record_preserve_time: Math.max(1, Math.min(7, payload.history_days || 1)) * 24,
    private_site: false, record_enabled: true, record_preserve_time: Math.max(1, Math.min(7, payload.history_days || 1)) * 24,
    sitename: payload.title || '妙妙屋探针', theme: 'emerald',
    theme_settings: { earthViewMode: payload.show_globe === false ? 'hide' : 'earth', visitorInfoCardEnabled: true, siteIcon: payload.icon || payload.logo || '', hideAdminEntryWhenLoggedOut: true },
  };
}
