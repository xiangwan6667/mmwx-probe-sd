import type { MaybeRefOrGetter } from 'vue'
import { computed, onScopeDispose, ref, shallowRef, toValue } from 'vue'
import { networkTargets } from '../../network-targets'
import { getPayload, subscribePayload } from '../../bridge'
export interface NodePingHistoryPoint { time: string; latency: number | null; loss: number | null }
export interface NodePingPerTaskStat { taskId: number; name: string; avgLatency: number; loss: number }
export interface NodePingStatsState { avgLatency: number | null; avgLoss: number | null; avgVolatility: number; history: NodePingHistoryPoint[]; hasData: boolean; perTaskStats: NodePingPerTaskStat[] }
export const NODE_PING_BAR_COUNT = 10
const valid=(v:number)=>Number.isFinite(v)&&v>=0
const average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null
export function useNodePingStats(uuid:MaybeRefOrGetter<string>, options?:{hours?:MaybeRefOrGetter<number>;enabled?:MaybeRefOrGetter<boolean>}) {
 const payload=shallowRef(getPayload())
 onScopeDispose(subscribePayload(next=>{payload.value=next}))
 const stats=computed<NodePingStatsState>(()=>{
  const series=(toValue(options?.enabled)??true)?payload.value?.servers?.[Number(toValue(uuid))]?.ping??[]:[]
  const perTaskStats=series.map((s,taskId)=>({taskId,name:s.label,avgLatency:valid(s.current_ms)?s.current_ms:-1,loss:valid(s.loss_pct)?s.loss_pct:-1}))
  const count=Math.max(0,...series.map(s=>s.buckets.length))
  const history=Array.from({length:count},(_,i)=>{
   const buckets=series.map(s=>s.buckets[i-(count-s.buckets.length)]).filter(b=>!!b)
   const latency=buckets.map(b=>b.ms).filter(valid);const loss=buckets.map(b=>b.loss).filter(valid)
   return {time:String(i+1),latency:latency.length?average(latency):null,loss:loss.length?average(loss):null}
  }).slice(-NODE_PING_BAR_COUNT)
  return {avgLatency:average(perTaskStats.map(s=>s.avgLatency).filter(valid)),avgLoss:average(perTaskStats.map(s=>s.loss).filter(valid)),avgVolatility:0,history,hasData:perTaskStats.some(s=>valid(s.avgLatency)||valid(s.loss)),perTaskStats}
 })
 const networks=computed(()=>networkTargets(payload.value?.tri_isp,payload.value?.servers?.[Number(toValue(uuid))]?.ping??[]))
 return {networks,stats,loading:ref(false),error:ref<string|null>(null),history:computed(()=>stats.value.history),avgLatency:computed(()=>stats.value.avgLatency),avgLoss:computed(()=>stats.value.avgLoss),avgVolatility:computed(()=>stats.value.avgVolatility),hasData:computed(()=>stats.value.hasData),perTaskStats:computed(()=>stats.value.perTaskStats)}
}
