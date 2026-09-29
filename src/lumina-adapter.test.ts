import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payloadToNodes, payloadToRealtime, pingSnapshot, todayTraffic } from './lumina/data-adapter';
test('Lumina preserves zero, unknown metrics and host node indices', () => {
 const payload = {enabled:true,servers:[{online:true,cpu_pct:0,boot_traffic_up:0,tcp_connections:0}]};
 assert.equal(payloadToNodes(payload)[0].uuid,'0');
 const rt=payloadToRealtime(payload)['0'];
 assert.equal(rt.cpu.usage,0); assert.ok(Number.isNaN(rt.ram.used));
 assert.equal(rt.network.totalUp,0);assert.ok(Number.isNaN(rt.network.totalDown));assert.equal(rt.connections.tcp,0);
});
test('Ping task identities match across nodes and preserve losses and zero latency',()=>{
 const ping={key:'x',label:'线路',current_ms:0,loss_pct:25,buckets:[{ms:0,loss:25}]};
 const data=pingSnapshot({enabled:true,servers:[{online:true,ping:[ping]},{online:true,ping:[ping]}]},1800000);
 assert.equal(data.tasks.length,1);assert.ok(data.tasks[0].id>0);assert.deepEqual(data.tasks[0].clients,['0','1']);
 assert.equal(data.records[0].value,0);assert.equal(data.records[0].loss,25);assert.equal(data.stats[0].latest,0);
});
test('Today traffic excludes missing days and retains measured zero',()=>{
 const now=new Date(2026,8,29,12).getTime();
 const data=todayTraffic({enabled:true,servers:[{online:true},{online:true,daily_traffic:[{date:'2026-09-29',uplink:0,downlink:10,total:10}]}]},['0','1'],now);
 assert.equal(data.length,2);assert.equal(data[0].client,'1');assert.equal(data[0].points[0].value,0);
});

test('System history retains gaps rather than converting unknown measurements into zero', async()=>{
 const {mapSystemHistory}=await import('./emerald/history');
 const rows=mapSystemHistory('0',{series:{cpu_pct:[{t:100,value:0},{t:200,value:null}],tcp_connections:[{t:100,value:0}]}});
 assert.equal(rows[0].cpu,0);assert.equal(rows[0].connections,0);assert.equal(rows[1].cpu,null);assert.equal(rows[1].connections,null);
});
test('Ping missing latency remains absent even with measured packet loss',()=>{
 const data=pingSnapshot({enabled:true,servers:[{online:true,ping:[{label:'失联',current_ms:-1,loss_pct:100,buckets:[{ms:-1,loss:100}]}]}]});
 assert.equal(data.stats[0].latest,null);assert.equal(data.records[0].value,-1);assert.equal(data.records[0].loss,100);
});
test('Disabled host payload exposes no nodes or traffic',()=>{
 const data={enabled:false,servers:[{online:true}]};
 assert.deepEqual(payloadToNodes(data),[]);assert.deepEqual(payloadToRealtime(data),{});assert.deepEqual(pingSnapshot(data).tasks,[]);assert.deepEqual(todayTraffic(data,['0'],Date.now()),[]);
});
test('With tri-ISP disabled the homepage always selects the first supplied probe',async()=>{
 const {publicConfig,pingTaskId}=await import('./lumina/data-adapter');
 const a={key:'a',label:'A',current_ms:1,loss_pct:0,buckets:[]};const b={...a,key:'b',label:'B'};
 const config=publicConfig({enabled:true,tri_isp:{targets:[{key:'b',label:'B',isp:'mobile'}]},servers:[{online:true,ping:[a,b]},{online:true,ping:[a]},{online:true}]});
 assert.deepEqual(config.theme_settings.homepagePingBindings,{[pingTaskId(a)]:['0','1']});
 assert.equal(config.theme_settings.enableHomepageMultiPing,false);
 const disabled=publicConfig({enabled:true,tri_isp:{enabled:false,targets:[{key:'b',label:'B',isp:'mobile'}]},servers:[{online:true,ping:[a,b]}]});
 assert.deepEqual(disabled.theme_settings.homepagePingBindings,{[pingTaskId(a)]:['0']});
 assert.equal(disabled.theme_settings.enableHomepageMultiPing,false);
});
test('Homepage maps configured tri-ISP probes to the three-line card display', async()=>{
 const {publicConfig,pingTaskId}=await import('./lumina/data-adapter');
 const lines=['telecom','unicom','mobile'].map((isp,i)=>({key:`${isp}-key`,label:isp,current_ms:20+i,loss_pct:i,buckets:[]}));
 const config=publicConfig({enabled:true,tri_isp:{enabled:true,targets:lines.map((line,i)=>({key:line.key,label:['电信','联通','移动'][i],isp:['telecom','unicom','mobile'][i]}))},servers:[{online:true,ping:lines}]});
 assert.equal(config.theme_settings.enableHomepageMultiPing,true);
 assert.deepEqual((config.theme_settings.homepageMultiPingNodeTaskIds as Record<string,number[]>)['0'],lines.map(pingTaskId));
});
test('Unknown current ping loss remains null',()=>{
 assert.equal(pingSnapshot({enabled:true,servers:[{online:true,ping:[{label:'unknown',current_ms:-1,loss_pct:-1,buckets:[]}]}]}).stats[0].loss,null);
});
test('Multi-Ping matches master keys and keeps missing ISP slots',async()=>{
 const payload={enabled:true,tri_isp:{enabled:true,targets:[{isp:'telecom',key:'ct',label:'电信广州'},{isp:'unicom',key:'cu',label:'联通上海'},{isp:'mobile',key:'cm',label:'移动北京'}]},servers:[{online:true,ping:[{key:'ct',label:'旧名字',current_ms:0,loss_pct:0,buckets:[]},{key:'cm',label:'移动',current_ms:-1,loss_pct:100,buckets:[]}]}]};
 const {publicConfig,pingTaskId}=await import('./lumina/data-adapter');
 const ids=publicConfig(payload).theme_settings.homepageMultiPingNodeTaskIds as Record<string,number[]>;
 assert.deepEqual(ids['0'],payload.tri_isp.targets.map(pingTaskId));
 const missingTask=pingSnapshot(payload).tasks.find(task=>task.id===pingTaskId(payload.tri_isp.targets[1]));
 assert.equal(missingTask?.name,'联通上海');
 assert.deepEqual(missingTask?.clients,[]);
});

test('Ping chart keeps unknown loss separate from real 100% loss',async()=>{
 const {alignPingChartRecords}=await import('./lumina/upstream/components/instance/pingChartData');
 const unknown=alignPingChartRecords([{record:{client:'0',task_id:1,time:'2026-01-01T00:00:00Z',value:-1,loss:null},time:0}],new Set(['1']),1000);
 assert.equal(unknown.lossPoints[0]?.['1'],null);
 const lost=alignPingChartRecords([{record:{client:'0',task_id:1,time:'2026-01-01T00:00:00Z',value:-1,loss:100},time:0}],new Set(['1']),1000);
 assert.equal(lost.lossPoints[0]?.['1'],100);
});
test('Footer routes use return-route results rather than ping latency',async()=>{
 const {cardRouteLines}=await import('./lumina/data-adapter');
 const payload:import('./types').ProbePayload={enabled:true,servers:[{online:true,return_routes:[{carrier:'telecom',route_type:'CN2GIA'},{carrier:'unicom',route_type:'10099'},{carrier:'mobile',route_type:'CMIN'}],ping:[{label:'电信',current_ms:35,loss_pct:0,buckets:[]}]}]};
 assert.deepEqual(cardRouteLines(payload,'0').map(line=>[line.name,line.route]),[['电信','CN2GIA'],['联通','10099'],['移动','CMI']]);
 assert.deepEqual(cardRouteLines({enabled:true,servers:[{online:true}]},'0').map(line=>line.route),['未知','未知','未知']);
 assert.deepEqual(cardRouteLines({...payload,enabled:false},'0'),[]);
});
