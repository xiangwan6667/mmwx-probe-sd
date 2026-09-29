import type { ProbePayload, ProbePingSeries } from '../types';
import { payloadToNodes as emeraldNodes } from '../emerald/data-adapter';
import { triISPRows } from '../tri-isp';
import type { NodeInfo, NodeRealtime, PingRecordsResponse, PingTask, PingTaskStats, PublicConfig } from './upstream/types/komari';
import type { TrafficMetricSeries } from './upstream/utils/trafficStats';
const number = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : NaN;
export { cardRouteLines } from '../probe-route-lines';
const baseNodesCache = new WeakMap<ProbePayload, ReturnType<typeof emeraldNodes>>();
const nodesCache = new WeakMap<ProbePayload, NodeInfo[]>();
const realtimeCache = new WeakMap<ProbePayload, Record<string, NodeRealtime & {online:boolean}>>();
function baseNodes(payload: ProbePayload) {
 let nodes=baseNodesCache.get(payload);
 if (!nodes) { nodes=emeraldNodes(payload.enabled ? payload : {...payload,servers:[]}); baseNodesCache.set(payload,nodes); }
 return nodes;
}
export function payloadToNodes(payload: ProbePayload): NodeInfo[] {
 const cached=nodesCache.get(payload); if(cached)return cached;
 const nodes=baseNodes(payload).map((node,index)=>({...node,traffic_period_end:payload.servers?.[index]?.period_end,billing_cycle:String(node.billing_cycle),gpu_name:'',ipv4:'',ipv6:''}));
 nodesCache.set(payload,nodes); return nodes;
}
const receivedTimes = new WeakMap<ProbePayload, number>();
export function payloadToRealtime(payload: ProbePayload): Record<string, NodeRealtime & {online:boolean}> {
 const cached=realtimeCache.get(payload); if(cached)return cached;
 const updatedAt=receivedTimes.get(payload)??Date.now(); receivedTimes.set(payload,updatedAt);
 const realtime=Object.fromEntries(baseNodes(payload).map(n=>[n.uuid,{updated_at:updatedAt,online:n.online,cpu:{usage:n.cpu},ram:{used:n.ram,total:n.mem_total},swap:{used:NaN,total:NaN},disk:{used:n.disk,total:n.disk_total},load:{load1:n.load,load5:n.load5,load15:n.load15},network:{up:n.net_out,down:n.net_in,totalUp:n.net_total_up,totalDown:n.net_total_down},connections:{tcp:n.connections,udp:n.connections_udp},uptime:n.uptime,process:NaN}]));
 realtimeCache.set(payload,realtime); return realtime;
}
export function publicConfig(payload:ProbePayload, loginEnabled=false):PublicConfig {
 const homepagePingBindings:Record<string,string[]>={};
 const homepageMultiPingNodeTaskIds:Record<string,number[]>={};
 if(payload.enabled)payload.servers?.forEach((server,index)=>{
  const triRows=triISPRows(payload.tri_isp,server.ping??[]);
  const triTaskIds=triRows.length===3 ? triRows.map(row=>{
   const target=payload.tri_isp?.targets?.find(target=>target.isp===row.isp);
   return pingTaskId(row.series??{key:target?.key,label:row.label});
  }) : [];
  if(triTaskIds.length===3) homepageMultiPingNodeTaskIds[String(index)]=triTaskIds;
  const series=server.ping?.[0];if(!series)return;
  (homepagePingBindings[String(pingTaskId(series))]??=[]).push(String(index));
 });
 const days=Math.max(1,Math.min(7,payload.history_days||1));
 return {sitename:payload.title||'妙妙屋探针',description:'',theme:'lumina',allow_cors:false,disable_password_login:!loginEnabled,oauth_enable:false,private_site:false,record_enabled:true,record_preserve_time:days*24,ping_record_preserve_time:days*24,metric_retention_days:days,custom_head:'',custom_body:'',theme_settings:{darkDepth:100,showGroupTabs:false,showCardGroup:false,homepagePingBindings,homepageMultiPingNodeTaskIds,enableHomepageMultiPing:Object.keys(homepageMultiPingNodeTaskIds).length>0,enableAdminButton:loginEnabled,hideAdminEntryWhenLoggedOut:!loginEnabled,fakePingForUnbound:false,showConnections:true,showCostsToGuests:true}};
}
// Stable positive ids remain consistent when nodes or task ordering change.
export function pingTaskId(series:Pick<ProbePingSeries,'key'|'label'>):number {
 let hash=2166136261; for(const char of series.key||series.label) hash=Math.imul(hash^char.charCodeAt(0),16777619);return (hash>>>0)%2147483646+1;
}
type PingSnapshot = PingRecordsResponse & {stats:PingTaskStats[];taskAssignmentsKnown:boolean};
const pingCache = new WeakMap<ProbePayload, {end:number;step:number;data:PingSnapshot}>();
export function pingSnapshot(payload:ProbePayload, now=Date.now(), step=300):PingRecordsResponse & {stats:PingTaskStats[];taskAssignmentsKnown:boolean} {
 const cached=pingCache.get(payload);
 const bucketEnd=Math.floor(now/(step*1000))*step*1000;
 if(cached && cached.end===bucketEnd && cached.step===step) return {...cached.data,rangeEndMs:now};
 const records:PingRecordsResponse['records']=[], tasks=new Map<number,PingTask>(),stats:PingTaskStats[]=[];
 const end=Math.floor(now/(step*1000))*step*1000;
 if(payload.enabled&&payload.tri_isp?.enabled) for(const target of payload.tri_isp.targets??[]) {
  const id=pingTaskId(target);
  tasks.set(id,{id,name:target.label,interval:step,loss:NaN,clients:[],type:'icmp',target:'',weight:tasks.size});
 }
 (payload.enabled ? payload.servers||[] : []).forEach((server,index)=>server.ping?.forEach(series=>{
  const id=pingTaskId(series),client=String(index);
  const task=tasks.get(id)||{id,name:series.label,interval:step,loss:NaN,clients:[],type:'icmp',target:'',weight:tasks.size}; task.clients.push(client);tasks.set(id,task);
  const values:number[]=[];
  series.buckets.forEach((bucket,i)=>{const value=number(bucket.ms);if(value>=0)values.push(value);records.push({client,task_id:id,time:new Date(end-(series.buckets.length-1-i)*step*1000).toISOString(),value:value>=0?value:-1,loss:Number.isFinite(bucket.loss)&&bucket.loss>=0?bucket.loss:null});});
  stats.push({client,taskId:id,name:series.label,type:'icmp',interval:step,total:series.buckets.length,valid:values.length,loss:number(series.loss_pct)>=0?series.loss_pct:null,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,avg:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,latest:number(series.current_ms)>=0?series.current_ms:null,p50:null,p99:null,stddev:null,p99P50Ratio:NaN});
 }));
 const data:PingSnapshot={count:records.length,records,tasks:[...tasks.values()],stats,taskAssignmentsKnown:true,intervalSeconds:step,rangeStartMs:records.length?Math.min(...records.map(r=>Date.parse(String(r.time)))):end,rangeEndMs:now};
 pingCache.set(payload,{end:bucketEnd,step,data}); return data;
}
export function todayTraffic(payload:ProbePayload, ids:string[],now:number):TrafficMetricSeries[]{
 if(!payload.enabled)return []; const date=new Date(now);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 return ids.flatMap(client=>{const day=payload.servers?.[Number(client)]?.daily_traffic?.find(row=>row.date===key);if(!day)return [];return [{metricKey:'traffic.up',value:day.uplink},{metricKey:'traffic.down',value:day.downlink}].filter(p=>Number.isFinite(p.value)).map(p=>({metricKey:p.metricKey,client,points:[{time:new Date(now).toISOString(),value:p.value,count:1}]}));});
}
