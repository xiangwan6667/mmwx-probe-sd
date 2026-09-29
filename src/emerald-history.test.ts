import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapSystemHistory, mapPingHistory, snapshotRecord } from './emerald/history';
test('system mapping preserves zero, missing metrics and timestamps', () => {
 const result = mapSystemHistory('0', {series: {cpu_pct:[{t:300,value:0},{t:600,value:null}],upload_speed:[{t:300,value:42}]}});
 assert.equal(result[0]?.cpu,0); assert.equal(result[0]?.net_out,42); assert.equal(result[0]?.ram,null); assert.equal(result[1]?.cpu,null); assert.equal(result[0]?.time,new Date(300000).toISOString());
});
test('ping buckets preserve gaps and reported partial loss without synthetic samples', () => {
 const result=mapPingHistory('0',{generated_at:950,bucket_sec:300,all_series:[{label:'线路',current_ms:20,loss_pct:25,buckets:[{ms:10,loss:0},{ms:-1,loss:-1},{ms:20,loss:25}]}]});
 assert.deepEqual(result.records.map(p=>p.value),[10,-1,20]); assert.deepEqual(result.lossRecords.map(p=>p.loss),[0,25]); assert.equal(result.records[0]?.time,new Date(300000).toISOString()); assert.equal(result.tasks[0]?.loss,12.5);
});
test('live snapshots never invent missing or offline samples',()=>{
 assert.equal(snapshotRecord('0',{online:false,cpu_pct:1},0),null);
 assert.equal(snapshotRecord('0',{online:true,cpu_pct:NaN},0)?.cpu,null);
});

import { fetchHistory } from './emerald/history';
import { effectScope } from 'vue';
import { receivePayload } from './emerald/bridge';
import { useNodePingStats } from './emerald/upstream/composables/useNodePingStats';

test('empty and entirely missing ping histories do not claim zero latency or loss', () => {
 const result = mapPingHistory('0', {all_series:[{label:'missing',current_ms:-1,loss_pct:-1,buckets:[{ms:-1,loss:-1}]}]});
 assert.equal(result.tasks[0]?.avg, undefined);
 assert.equal(result.tasks[0]?.loss, undefined);
 assert.deepEqual(result.lossRecords, []);
});
test('history fetch uses public series route, preserves server zero and forwards cancellation', async (t) => {
 const calls: Array<{url: string; signal: AbortSignal | null | undefined}> = [];
 t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
  calls.push({url, signal:init?.signal});
  return Response.json({success:true,series:{}});
 });
 const controller = new AbortController();
 await fetchHistory('0',24,'system',controller.signal);
 await fetchHistory('1',72,'ping');
 assert.deepEqual(calls.map(c=>c.url), ['/api/series?server=0&range=24h&metric=system','/api/series?server=1&range=3d&all=1']);
 assert.equal(calls[0]?.signal,controller.signal);
});
test('home statistics follow host snapshots, keep gaps and never fan out requests', (t) => {
 const fetch = t.mock.method(globalThis,'fetch',()=>{throw new Error('unexpected fanout')});
 receivePayload({enabled:true,servers:[{online:true}]});
 const scope=effectScope();
 const stats=scope.run(()=>useNodePingStats('0'))!;
 assert.equal(stats.avgLatency.value,null);
 assert.equal(stats.avgLoss.value,null);
 receivePayload({enabled:true,servers:[{online:true,ping:[{label:'line',current_ms:-1,loss_pct:100,buckets:[{ms:-1,loss:-1},{ms:-1,loss:100}]}]}]});
 assert.equal(stats.avgLatency.value,null);
 assert.equal(stats.avgLoss.value,100);
 assert.deepEqual(stats.history.value.map(p=>p.loss),[null,100]);
 assert.equal(fetch.mock.callCount(),0);
 scope.stop();
 receivePayload({enabled:true,servers:[]});
 assert.equal(stats.avgLoss.value,100);
});

import { networkTargets } from './emerald/network-targets';
test('Emerald network targets match configured keys and retain missing ISP slots',()=>{
 const series=[{key:'cu',label:'renamed',current_ms:20,loss_pct:0,buckets:[]},{key:'other',label:'unrelated',current_ms:2,loss_pct:0,buckets:[]}];
 const result=networkTargets({enabled:true,targets:[{isp:'电信',key:'dx',label:'电信目标'},{isp:'联通',key:'cu',label:'联通目标'}]},series);
 assert.equal(result.label,'三网');
 assert.deepEqual(result.targets.map(t=>[t.name,t.latency]),[['电信目标',null],['联通目标',20]]);
});
test('unconfigured or fallback ping targets carry generic labels',()=>{
 const series=[{key:'other',label:'东京',current_ms:0,loss_pct:0,buckets:[]}];
 assert.equal(networkTargets(undefined,series).label,'延迟目标');
 assert.equal(networkTargets({enabled:true,targets:[{isp:'电信',key:'dx',label:'电信'}]},series).label,'延迟目标');
 assert.deepEqual(networkTargets(undefined,series).targets,[{name:'东京',latency:0}]);
});

import { escapeTooltipText } from './emerald/tooltip';
test('chart tooltip labels escape HTML tags, attributes and entities',()=>{
 assert.equal(escapeTooltipText('<img src=x onerror="alert(1)"> & \'test\''), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;test&#39;');
 assert.equal(escapeTooltipText('电信 < 20ms'), '电信 &lt; 20ms');
});
