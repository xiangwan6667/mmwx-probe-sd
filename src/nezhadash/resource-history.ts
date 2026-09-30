import { getProbe } from './bridge';
import { toNezhaData } from './adapter';
import { fetchServerMetrics } from './upstream/lib/nezha-api';
import type { MetricPeriod, MetricType, NezhaWebsocketResponse } from './upstream/types/nezha-api';
const fieldMap = { cpu: 'cpu', memory: 'mem_used', disk: 'disk_used', net_out_speed: 'net_out_speed', net_in_speed: 'net_in_speed', tcp_conn: 'tcp_conn_count', udp_conn: 'udp_conn_count' } as const;
/** Adapt timestamped host measurements to upstream's original snapshot chart input. */
export async function resourceHistory(id: number, period: MetricPeriod): Promise<{ data: string }[]> {
 const live = toNezhaData(getProbe()).servers.find(server => server.id === id);
 if (!live) return [];
 const results = await Promise.all(Object.keys(fieldMap).map(async metric => ({ metric: metric as keyof typeof fieldMap, response: await fetchServerMetrics(id, metric as MetricType, period) })));
 const snapshots = new Map<number, NezhaWebsocketResponse>();
 for (const {metric,response} of results) for(const point of response.data.data_points) {
  let snapshot = snapshots.get(point.ts);
  if(!snapshot) {
   const state = Object.fromEntries(Object.keys(live.state).map(key => [key, ['gpu','temperatures'].includes(key) ? [] : NaN])) as unknown as typeof live.state;
   snapshot = { now: point.ts, servers: [{...live, state}] };
   snapshots.set(point.ts,snapshot);
  }
  snapshot.servers[0].state[fieldMap[metric]] = point.value;
 }
 return [...snapshots.values()].sort((a,b)=>b.now-a.now).map(data=>({data:JSON.stringify(data)}));
}
