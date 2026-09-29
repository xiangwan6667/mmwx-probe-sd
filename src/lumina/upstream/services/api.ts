/** Lumina's read-only API boundary. Live data comes from the embedding host. */
import { getPayload } from '../../bridge';
import { payloadToNodes, payloadToRealtime, publicConfig, pingSnapshot, todayTraffic } from '../../data-adapter';
import { fetchHistory, mapSystemHistory, rangeForHours } from '../../../emerald/history';
import { probeRangeBucketSec } from '../../../probe-ranges';
import { loadSiteSettings } from '../../../site-settings';
import type { ProbePayload } from '../../../types';
import type { AdminClient, LoadRecord, LoadRecordsResponse, Me, PingRecordsResponse, PingTask, PingTaskStats, PublicConfig } from '../types/komari';
import type { TrafficMetricSeries } from '../utils/trafficStats';
interface ApiCallOptions { signal?:AbortSignal; timeout?:number }
const payload=():ProbePayload=>{const current=getPayload();if(!current)throw new Error('等待主控数据');return current;};
const check=(options?:ApiCallOptions)=>options?.signal?.throwIfAborted();
export class ApiRequestError extends Error {constructor(message:string,public readonly status:number,public readonly path:string){super(message);this.name='ApiRequestError';}}
export class MetricApiUnavailableError extends Error {}
export async function getMe(options?:ApiCallOptions):Promise<Me>{check(options);return {logged_in:false,username:'',uuid:''};}
export async function getPublic(options?:ApiCallOptions):Promise<PublicConfig>{check(options);const settings=await loadSiteSettings();return publicConfig(payload(),settings.master_login_enabled);}
export async function getNodes(options?:ApiCallOptions){check(options);return payloadToNodes(payload());}
export async function getNodesLatestStatus(uuids?:string[],options?:ApiCallOptions):Promise<Record<string,unknown>>{check(options);return Object.fromEntries(Object.entries(payloadToRealtime(payload())).filter(([id])=>!uuids?.length||uuids.includes(id)));}
export async function getLoadRecords(uuid:string,hours=6,options?:ApiCallOptions & {skipMetricQuery?:boolean}):Promise<LoadRecordsResponse>{
 check(options);const data=await fetchHistory(uuid,hours,'system',options?.signal);
 const records=mapSystemHistory(uuid,data).map(record=>Object.fromEntries(Object.entries(record).map(([key,value])=>[key,value===null?NaN:value])) as LoadRecord);
 return {count:records.length,records,intervalSeconds:data.bucket_sec || probeRangeBucketSec(rangeForHours(hours)),rangeStartMs:Date.now()-hours*3600000,rangeEndMs:Date.now()};
}
export async function getPingRecords(uuid:string,hours=6,options?:ApiCallOptions):Promise<PingRecordsResponse>{
 check(options);const data=await fetchHistory(uuid,hours,'ping',options?.signal);
 const result=pingSnapshot({enabled:true,servers:[{online:true,ping:data.all_series||[]}]},(data.generated_at??Date.now()/1000)*1000,data.bucket_sec||probeRangeBucketSec(rangeForHours(hours)));
 return {...result,records:result.records.map(r=>({...r,client:uuid})),tasks:result.tasks.map(t=>({...t,clients:[uuid]})),stats:result.stats.map(s=>({...s,client:uuid}))};
}
export interface TodayTrafficMetricResponse {series:TrafficMetricSeries[];rangeStartMs:number;rangeEndMs:number;intervalSeconds?:number}
export async function getTodayTrafficMetrics(ids:string[],startMs:number,endMs:number,options?:ApiCallOptions):Promise<TodayTrafficMetricResponse>{check(options);return {series:todayTraffic(payload(),ids,endMs),rangeStartMs:startMs,rangeEndMs:endMs};}
export async function getPingOverview(hours=1,taskId?:number,options?:ApiCallOptions & {entityIds?:string[];includeStats?:boolean}){
 check(options);const data=pingSnapshot(payload());const selected=(client:string,id:number)=>(taskId===undefined||taskId===id)&&(!options?.entityIds?.length||options.entityIds.includes(client));
 const records=data.records.filter(r=>selected(r.client,r.task_id)&&Date.parse(String(r.time))>=Date.now()-hours*3600000);
 return {...data,count:records.length,records,tasks:data.tasks.filter(t=>taskId===undefined||t.id===taskId),stats:data.stats.filter(s=>selected(s.client,s.taskId))};
}
export async function getPingOverviewStats(hours:number,taskIds:number[],options?:ApiCallOptions & {entityIds?:string[]}):Promise<PingTaskStats[]>{return (await getPingOverview(hours,undefined,options)).stats.filter(s=>taskIds.includes(s.taskId));}
const unsupported=():never=>{throw new Error('此主题通过主控提供只读数据，请在主控管理设置');};
export async function getAdminClients(_options?:ApiCallOptions):Promise<AdminClient[]>{return unsupported();}
export async function getAdminPingTasks(_options?:ApiCallOptions):Promise<PingTask[]>{return unsupported();}
export async function getAdminEntryPath(_options?:ApiCallOptions):Promise<string>{return '/login';}
export async function saveThemeSettings(_theme:string,_settings:Record<string,unknown>):Promise<void>{unsupported();}

// The host bridge has no RPC capability negotiation or dependency request to warm.
export function prewarmPingOverviewDependencies(): void {}
const degradationWarnings = new Set<string>();
export function warnDegradedOnce(key: string, message: string): void {
 if (degradationWarnings.has(key)) return;
 degradationWarnings.add(key); console.warn(message);
}
