import test from 'node:test';
import assert from 'node:assert/strict';
import { payloadToNodes, payloadToRealtime, pingSnapshot } from './lumina/data-adapter';
import { receivePayload } from './lumina/bridge';
import { retainStore, subscribeToNodeMeta, subscribeToNodeMetrics, getNodeMetricsSnapshot } from './lumina/upstream/services/wsStore';

test('cached immutable snapshots preserve zero, new frame timestamps and ping bucket boundaries', () => {
 const payload={enabled:true,servers:[{online:true,cpu_pct:0,ping:[{label:'A',current_ms:0,loss_pct:0,buckets:[{ms:0,loss:0}]}]}]};
 assert.equal(payloadToNodes(payload),payloadToNodes(payload));
 assert.equal(payloadToRealtime(payload),payloadToRealtime(payload));
 const next={...payload,servers:[{...payload.servers[0],cpu_pct:10}]};
 assert.notEqual(payloadToRealtime(next),payloadToRealtime(payload));
 assert.equal(payloadToRealtime(next)['0'].cpu.usage,10);
 const first=pingSnapshot(payload,300001); const same=pingSnapshot(payload,300002);
 assert.equal(first.records,same.records); assert.equal(same.rangeEndMs,300002);
 const boundary=pingSnapshot(payload,600000);
 assert.notEqual(boundary.records,first.records);
 assert.equal(Date.parse(String(boundary.records[0].time))-Date.parse(String(first.records[0].time)),300000);
 assert.notEqual(pingSnapshot(payload,600000,60).records,boundary.records);
});

test('repeated missing metrics do not notify unrelated metadata; zero and online changes do', async () => {
 const oldWindow=globalThis.window;
 globalThis.window={setTimeout,clearTimeout,addEventListener(){},removeEventListener(){}} as unknown as Window & typeof globalThis;
 const flush=()=>new Promise(resolve=>setTimeout(resolve,10));
 let metaEvents=0, metricEvents=0;
 const stopMeta=subscribeToNodeMeta('0',()=>metaEvents++);
 const stopMetrics=subscribeToNodeMetrics('0',()=>metricEvents++);
 const payload={enabled:true,servers:[{online:true}]};
 receivePayload(payload); const release=retainStore();
 try {
  await flush(); const metaBefore=metaEvents, metricsBefore=metricEvents;
  receivePayload(payload); await flush();
  assert.equal(metaEvents,metaBefore); assert.equal(metricEvents,metricsBefore);
  receivePayload({...payload}); await flush();
  assert.equal(metaEvents,metaBefore); // new arrival timestamp only affects metrics
  receivePayload({enabled:true,servers:[{online:true,cpu_pct:0}]}); await flush();
  assert.equal(getNodeMetricsSnapshot('0')?.cpuPct,0);
  assert.ok(metricEvents>metricsBefore); assert.equal(metaEvents,metaBefore);
  receivePayload({enabled:true,servers:[{online:false,cpu_pct:0}]}); await flush();
  assert.equal(getNodeMetricsSnapshot('0')?.online,false);
 } finally { stopMeta(); stopMetrics(); release(); await flush(); globalThis.window=oldWindow; }
});
