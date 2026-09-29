import { toNezhaData, toNezhaGroups, toMonitor } from './nezhadash/adapter';
import type { ProbePayload } from './types';
function check(value: boolean, message: string) { if (!value) throw new Error(message); }
const data: ProbePayload = { enabled: true, servers: [
  { name: '离线', online: false, region: '日本' },
  { name: '在线', online: true, region: '香港', region_country: 'HK', cpu_pct: 0, upload_speed: 2048, boot_traffic_up: 0, cumulative_up: 123, traffic_used: 999, mem_used: 0, mem_total: 1024 },
] };
const mapped = toNezhaData(data, 100000);
check(mapped.servers[1].id === 1, 'API index survives conversion');
check(mapped.servers[1].state.net_out_speed === 2048, 'byte speeds are not converted twice');
check(mapped.servers[1].state.net_out_transfer === 0, 'boot traffic preserves zero and does not use billed traffic');
check(mapped.servers[1].state.mem_used === 0, 'zero usage survives');
check(mapped.servers[0].last_active.startsWith('000'), 'offline stays offline');
check(toNezhaGroups(data).data.find(group => group.group.name === '香港')?.servers[0] === 1, 'group uses original indices');
const monitor = toMonitor(1, '在线', { generated_at: 1800, bucket_sec: 300, all_series: [{ label: '线路', current_ms: 12, loss_pct: 0, buckets: [{ ms: 0, loss: 0 }, { ms: -1, loss: 100 }, { ms: 12, loss: 0 }] }] });
check(monitor.data[0].created_at[0] === 1200000, 'probe seconds convert to Nezha milliseconds at original bucket boundaries');
check(monitor.data[0].avg_delay[0] === 0, 'zero latency is retained');
check(monitor.data[0].created_at.length === 3 && monitor.data[0].avg_delay[1] === null && monitor.data[0].packet_loss?.[1] === 100, 'complete packet loss retains its timestamp and creates a delay gap');
