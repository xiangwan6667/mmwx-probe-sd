import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { toNezhaData } from './nezhadash/adapter';
import { receiveProbe } from './nezhadash/bridge';
import { formatNezhaInfo } from './nezhadash/upstream/lib/utils';
import ServerCard from './nezhadash/upstream/components/ServerCard';
import type { ProbePayload } from './types';
Object.assign(globalThis, { window: { CustomBackgroundImage:'', FixedTopServerName:false, ShowTrafficBar:false }, sessionStorage: {setItem(){},removeItem(){},getItem(){return null;}} });
const payload:ProbePayload={enabled:true,servers:[{name:'wire-zero',online:true,cpu_pct:0,mem_total:100,mem_used:0,disk_total:100,disk_used:0,upload_speed:0,download_speed:0}]};
test('upstream JSON snapshots preserve zero and restore null missing speeds',()=>{
 const data=toNezhaData(payload,1000);
 const wire=JSON.parse(JSON.stringify(data));
 assert.equal(formatNezhaInfo(1000,wire.servers[0]).up,0);
 delete payload.servers![0].upload_speed;
 const missing=JSON.parse(JSON.stringify(toNezhaData(payload,1000)));
 assert.ok(Number.isNaN(formatNezhaInfo(1000,missing.servers[0]).up));
 payload.servers![0].upload_speed=0;
});
test('actual BITJEBE card shows true zero and hides entire missing metric item',()=>{
 receiveProbe(payload);
 const render=()=>renderToStaticMarkup(createElement(MemoryRouter,null,createElement(ServerCard,{now:1000,serverInfo:toNezhaData(payload,1000).servers[0]})));
 const zero=render();assert.match(zero,/0\.00%/);assert.match(zero,/serverCard.upload/);assert.match(zero,/0\.00K\/s/);
 delete payload.servers![0].upload_speed;
 const missing=render();assert.doesNotMatch(missing,/serverCard.upload/);assert.doesNotMatch(missing,/NaN/);
});
test('historical snapshot adapter keeps timestamps, gaps and original byte units',async()=>{
 const {resourceHistory}=await import('./nezhadash/resource-history');
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,series:{cpu_pct:[{t:10,value:0}],mem_used:[{t:20,value:77}],upload_speed:[{t:20,value:2048}]}}),{status:200});
 try{
  receiveProbe(payload);
  const rows=(await resourceHistory(0,'24h')).map(row=>JSON.parse(row.data));
  assert.equal(rows[0].now,20000);assert.equal(rows[1].now,10000);
  assert.equal(rows[0].servers[0].state.mem_used,77);
  assert.equal(rows[0].servers[0].state.net_out_speed,2048);
  assert.equal(rows[0].servers[0].state.cpu,null);
  assert.equal(rows[1].servers[0].state.cpu,0);
  assert.ok(Number.isNaN(formatNezhaInfo(20000,rows[0].servers[0]).cpu));
 }finally{globalThis.fetch=previousFetch;}
});
test('BITJEBE byte formatting distinguishes invalid data and clamps fractional-byte units', async()=>{
 const {formatBytes}=await import('./nezhadash/upstream/lib/format');
 for(const invalid of [NaN, Infinity, -Infinity, -1]) assert.equal(formatBytes(invalid),'—');
 assert.equal(formatBytes(0),'0 Bytes');
 assert.equal(formatBytes(0.5),'0.5 Bytes');
 assert.equal(formatBytes(1024),'1 KiB');
});
test('local SVG flags normalize country codes and hide invalid countries',async()=>{
 const {default:ServerFlag}=await import('./nezhadash/upstream/components/ServerFlag');
 for(const country_code of ['HK',' hk ','hK']) {
  const markup=renderToStaticMarkup(createElement(ServerFlag,{country_code}));
  assert.match(markup,/fi fi-hk/);assert.match(markup,/aria-label="🇭🇰"/);
 }
 for(const country_code of ['', 'ZZ', 'USA', '<HK>']) assert.equal(renderToStaticMarkup(createElement(ServerFlag,{country_code})), '');
});
