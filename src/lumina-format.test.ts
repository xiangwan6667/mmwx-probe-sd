import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBytes, formatFixed, formatByteRateLabel, formatTrafficRateLabel } from './lumina/upstream/utils/format';
import { computeTrafficUsed, resolveTrafficUsage } from './lumina/upstream/utils/traffic';

test('Lumina overview displays billed usage as the main total without depending on raw directions',async()=>{
 const {createElement}=await import('react'); const {renderToStaticMarkup}=await import('react-dom/server');
 const {MemoryRouter}=await import('react-router-dom');
 const {HomeOverviewCards}=await import('./lumina/upstream/components/node/NodeGrid');
 const render=(billableTraffic:number)=>renderToStaticMarkup(createElement(MemoryRouter,null,createElement(HomeOverviewCards,{
  overview:{totalNodes:2,onlineNodes:1,offlineNodes:1,billableTraffic,trafficLimit:42.48*1024**4,remainingTraffic:40.55*1024**4,netUp:0,netDown:0},
  costSummary:null,costLoading:false,showOverviewRatings:false,showTrafficRating:false,showBandwidthRating:false,showAssetRating:false,
  trafficRatingLabels:'',bandwidthRatingLabels:'',assetRatingLabels:'',showCosts:false,showDetailButton:false,renewalNodes:[],dense:false,onWarmTraffic:()=>{},
 })));
 {
  const html=render(1.93*1024**4);
  const card=html.match(/<article[^>]*data-metric="traffic"[\s\S]*?<\/article>/)?.[0];
  assert.ok(card,'usage remains visible when the master supplies billed usage');
  assert.match(card, /overview-card-value">1\.93<span/);
  assert.doesNotMatch(card, /配额|剩余/);
  assert.doesNotMatch(card, /周期上行|周期下行|—/);
 }
 assert.match(render(0), /overview-card-value">0<span/);
 assert.doesNotMatch(render(NaN), /data-metric="traffic"/);
});

test('Lumina distinguishes missing measurements from real zero', () => {
  for (const missing of [NaN, Infinity, -Infinity]) {
    assert.equal(formatBytes(missing), '—');
    assert.equal(formatFixed(missing, 2), '—');
    assert.equal(formatByteRateLabel(missing), '—');
    assert.equal(formatTrafficRateLabel(missing), '—');
  }
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatFixed(0, 2), '0.00');
  assert.equal(formatByteRateLabel(0), '0 B/s');
});

test('Lumina cumulative traffic does not invent missing usage or quota', () => {
  assert.ok(Number.isNaN(computeTrafficUsed('sum', NaN, 20)));
  assert.ok(Number.isNaN(computeTrafficUsed('max', NaN, 20)));
  assert.equal(computeTrafficUsed('down', NaN, 20), 20);
  assert.equal(computeTrafficUsed('sum', 0, 20), 20);
  const missing = resolveTrafficUsage('sum', NaN, 20, NaN);
  assert.equal(missing.unlimited, false);
  assert.ok(Number.isNaN(missing.used));
  assert.ok(Number.isNaN(missing.remaining));
  assert.equal(resolveTrafficUsage('sum', 0, 20, 0).unlimited, true);
});

test('Lumina quota uses adjusted billable usage independently of boot counters', () => {
  const traffic = resolveTrafficUsage('sum', 3, 8, 20, 12);
  assert.equal(traffic.used, 12);
  assert.equal(traffic.remaining, 8);
  assert.equal(traffic.fraction, 0.6);
  assert.ok(Number.isNaN(resolveTrafficUsage('sum', 3, 8, 20, NaN).used));
  assert.equal(resolveTrafficUsage('sum', 3, 8, 20).used, 11);
});

import { normalizeBillingCycle, formatRenewalPrice } from './lumina/upstream/utils/billing';
import { calculateCostSummary, formatCnyMoney } from './lumina/upstream/utils/cost';
import type { NodeInfo } from './lumina/upstream/types/komari';
test('Lumina missing billing periods and expiry stay incomplete', () => {
  assert.ok(Number.isNaN(normalizeBillingCycle('NaN').days));
  assert.ok(Number.isNaN(normalizeBillingCycle('').days));
  assert.equal(formatRenewalPrice({ price: 4, currency: '€', billing_cycle: 'NaN' }), '€4 · 周期缺失');
  const node = { uuid: 'missing-expiry', name: 'Unknown expiry', price: 4, currency: 'CNY', billing_cycle: '30', expired_at: '' } as NodeInfo;
  const summary = calculateCostSummary([node], [], {});
  assert.equal(summary.details[0].note, '期限缺失');
  assert.equal(summary.details[0].counted, false);
  assert.equal(formatCnyMoney(summary.remainingCny), '—');
  assert.equal(formatCnyMoney(summary.monthlyCny), '—');
});

import { getTrafficResetDisplay } from './lumina/upstream/utils/trafficReset';
test('Lumina reset hint requires an explicit future traffic period end', () => {
  const now = new Date(2026, 8, 29, 12).getTime();
  assert.equal(getTrafficResetDisplay(undefined, now), null);
  assert.equal(getTrafficResetDisplay('2026-08-30', now), null);
  const reset = getTrafficResetDisplay('2026-10-15', now);
  assert.ok(reset?.title.includes('2026-10-15'));
  assert.ok(!reset?.title.includes('每月'));
});

import { summarizePeriodTraffic } from './lumina/upstream/utils/traffic';
test('Lumina overview sums period traffic including offline nodes without mixing boot counters', () => {
 const nodes = [{period_traffic_up:0,period_traffic_down:10,online:false},{period_traffic_up:20,period_traffic_down:30,online:true}];
 assert.deepEqual(summarizePeriodTraffic(nodes), {up:20,down:40});
 assert.ok(Number.isNaN(summarizePeriodTraffic([{period_traffic_down:10}]).up));
});

import { hasMeasurement, allMeasurements, hasText } from './lumina/upstream/utils/dataVisibility';
test('Lumina data visibility hides missing fields while preserving zero and recovery',()=>{
 assert.equal(hasMeasurement(NaN),false); assert.equal(hasMeasurement(undefined),false);
 assert.equal(hasMeasurement(0),true); assert.equal(hasMeasurement(3),true);
 assert.equal(allMeasurements([0,NaN]),false); assert.equal(allMeasurements([0,3]),true);
 assert.equal(hasText(''),false); assert.equal(hasText('Linux'),true);
});

test('Lumina metric rendering removes missing data and restores measured zero',async()=>{
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {MetricBar}=await import('./lumina/upstream/components/node/MetricBar');
 const props={icon:null,label:'CPU',valueText:'0.00',unit:'%',fraction:NaN,paint:'red'};
 assert.equal(renderToStaticMarkup(createElement(MetricBar,props)), '');
 assert.match(renderToStaticMarkup(createElement(MetricBar,{...props,fraction:0})), /0.00/);
 assert.equal(renderToStaticMarkup(createElement(MetricBar,props)), '');
});

test('Lumina retains explicitly reported zero uptime and renewal price',async()=>{
 const {formatUptimeDays}=await import('./lumina/upstream/utils/format');
 assert.equal(formatUptimeDays(0).value,'0');
 assert.equal(formatRenewalPrice({price:0,currency:'CNY',billing_cycle:'30'}),'免费');
});

test('Lumina list keeps the OS cell slot for mixed missing metadata',async()=>{
 const {createElement}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {NodeOsCell}=await import('./lumina/upstream/components/node/NodeListView');
 const row=(os:string)=>renderToStaticMarkup(createElement('div',null,createElement('div',null,'node'),createElement(NodeOsCell,{os,osName:os}),createElement('div',null,'CPU 0')));
 for (const os of ['', 'Linux']) {
  const html=row(os);
  assert.match(html, /class="node-list-cell col-os"/);
  assert.ok(html.indexOf('col-os') < html.indexOf('CPU 0'));
 }
 assert.equal(renderToStaticMarkup(createElement(NodeOsCell,{os:'',osName:'unknown'})), '<div class="node-list-cell col-os"></div>');
});

test('Lumina absent OS has neither fallback icon nor invented Linux description',async()=>{
 const {createElement}=await import('react'); const {renderToStaticMarkup}=await import('react-dom/server');
 const {OsLogo}=await import('./lumina/upstream/components/ui/OsLogo');
 const {nodeDetailLinkLabels}=await import('./lumina/upstream/components/node/nodeCardShared');
 assert.equal(renderToStaticMarkup(createElement(OsLogo,{value:''})), '');
 assert.deepEqual(nodeDetailLinkLabels('node',''),{title:'查看详情',ariaLabel:'查看 node 详情'});
 assert.match(renderToStaticMarkup(createElement(OsLogo,{value:'Linux'})), /Linux/);
});

test('Lumina home brand renders and updates the supplied public site title',async()=>{
 const {createElement}=await import('react'); const {renderToStaticMarkup}=await import('react-dom/server');
 const {HomeBrand}=await import('./lumina/upstream/components/node/NodeGrid');
 const {publicConfig}=await import('./lumina/data-adapter');
 for(const title of ['测试探针站','更新后的很长站点名字']) {
  const config=publicConfig({enabled:true,title});
  const html=renderToStaticMarkup(createElement(HomeBrand,{siteName:config.sitename}));
  assert.match(html,new RegExp(title));
 }
 assert.equal(renderToStaticMarkup(createElement(HomeBrand,{siteName:''})), '');
});
