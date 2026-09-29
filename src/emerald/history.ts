import type { ProbeServer, ProbePingSeries } from '../types';
import type { RecordFormat } from './upstream/utils/recordHelper';
export type SystemResponse = { success?: boolean; series?: Record<string, {t:number;value:number|null}[]> };
export type PingResponse = { success?:boolean; generated_at?:number; bucket_sec?:number; all_series?:ProbePingSeries[] };
const finite=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)?v:null;
const fields={cpu_pct:'cpu',mem_used:'ram',mem_total:'ram_total',disk_used:'disk',disk_total:'disk_total',upload_speed:'net_out',download_speed:'net_in',tcp_connections:'connections',udp_connections:'connections_udp'} as const;
function blank(client:string,time:number):RecordFormat {return {client,time:new Date(time).toISOString(),cpu:null,gpu:null,gpu_usage:null,gpu_memory:null,ram:null,ram_total:null,swap:null,swap_total:null,load:null,temp:null,disk:null,disk_total:null,net_in:null,net_out:null,net_total_up:null,net_total_down:null,process:null,connections:null,connections_udp:null};}
export function mapSystemHistory(uuid:string,payload:SystemResponse):RecordFormat[]{
 const records=new Map<number,RecordFormat>();
 for(const [key,target] of Object.entries(fields)) for(const p of payload.series?.[key]??[]) {if(!Number.isFinite(p.t))continue; const r=records.get(p.t)??blank(uuid,p.t*1000); r[target]=finite(p.value);records.set(p.t,r);}
 return [...records].sort(([a],[b])=>a-b).map(([,r])=>r);
}
export function snapshotRecord(uuid:string,server:ProbeServer,now:number):RecordFormat|null{
 if(!server.online)return null; const r=blank(uuid,now);
 for(const [key,target] of Object.entries(fields))r[target]=finite(server[key as keyof ProbeServer]);
 r.load=finite(Number.parseFloat(server.loadavg??''));return r;
}
const average=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:undefined;
export function mapPingHistory(uuid:string,payload:PingResponse){
 const step=payload.bucket_sec||300;const generated=payload.generated_at??Math.floor(Date.now()/1000);const end=generated-generated%step;
 const records:{client:string;task_id:number;time:string;value:number}[]=[];
 const lossRecords:{task_id:number;time:string;loss:number}[]=[];
 const tasks=(payload.all_series??[]).map((s,id)=>{
 const values:number[]=[];const losses:number[]=[];
 s.buckets.forEach((b,i)=>{const time=new Date((end-(s.buckets.length-1-i)*step)*1000).toISOString();const value=finite(b.ms); records.push({client:uuid,task_id:id,time,value:value!==null&&value>=0?value:-1});if(value!==null&&value>=0)values.push(value);if(finite(b.loss)!==null&&b.loss>=0){losses.push(b.loss);lossRecords.push({task_id:id,time,loss:b.loss});}});
 return {id,name:s.label,interval:step,loss:average(losses),avg:average(values),latest:validLatency(s.current_ms),min:values.length?Math.min(...values):undefined,max:values.length?Math.max(...values):undefined,total:s.buckets.length};
 });return {records,lossRecords,tasks};
}
function validLatency(value:number){return Number.isFinite(value)&&value>=0?value:undefined;}
export function rangeForHours(hours:number){return hours<=24?`${hours}h`:`${hours/24}d`;}
export async function fetchHistory(uuid:string,hours:number,metric:'system'|'ping',signal?:AbortSignal):Promise<SystemResponse & PingResponse>{
 const response=await fetch(`/api/series?server=${encodeURIComponent(uuid)}&range=${rangeForHours(hours)}&${metric==='system'?'metric=system':'all=1'}`, { signal });
 if(!response.ok)throw new Error(`HTTP ${response.status}`); const data=await response.json() as SystemResponse & PingResponse;if(data.success===false)throw new Error('历史数据暂不可用');return data;
}
