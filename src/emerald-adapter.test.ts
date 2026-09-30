import test from 'node:test';
import assert from 'node:assert/strict';
import { payloadToNodes, createPublicSettings } from './emerald/data-adapter';
import { getPayload, receivePayload, subscribePayload, installHostBridge } from './emerald/bridge';
import { formatBytes, formatBytesWithConfig, formatBytesSplit, formatBytesPerSecond, formatUptime, formatUptimeWithFormat, formatMetric } from './emerald/upstream/utils/helper';
import { getPriceTags, getTrafficUsed, getMemPercentage } from './emerald/upstream/utils/nodeHelpers';
import * as nodeHelpers from './emerald/upstream/utils/nodeHelpers';
import { snapshotRecord } from './emerald/history';

test('visibility follows missing, zero and newly received data without partial totals', () => {
  const [missing] = payloadToNodes({enabled:true,servers:[{online:true}]});
  assert.equal(typeof nodeHelpers.hasMeasurement, 'function');
  assert.equal(nodeHelpers.hasMeasurement(missing.cpu), false);
  assert.equal(nodeHelpers.hasMeasurement(null), false);
  assert.equal(nodeHelpers.hasMeasurement(0), true);
  const [received] = payloadToNodes({enabled:true,servers:[{online:true,cpu_pct:0,mem_used:0}]});
  assert.equal(nodeHelpers.hasMeasurement(received.cpu), true);
  assert.ok(Number.isNaN(nodeHelpers.sumNodeMetric([missing,received], 'cpu')));
  assert.equal(nodeHelpers.hasHistoryMeasurement([{cpu:null}], ['cpu']), false);
  assert.equal(nodeHelpers.hasHistoryMeasurement([{cpu:0}], ['cpu']), true);
});

test('fractional byte measurements stay in bytes and huge values stay in the largest unit', () => {
  assert.equal(formatBytes(0.5), '0.5 B');
  assert.equal(formatBytesWithConfig(0.5, { B: 1 }), '0.5 B');
  assert.deepEqual(formatBytesSplit(0.5, { B: 1 }), { value: '0.5', unit: 'B' });
  assert.equal(formatBytes(1024 ** 7), '1048576.0 PB');
});

test('price tags preserve currencies outside the exchange-rate list', () => {
  const node = payloadToNodes({ enabled: true, servers: [{ online: true, renewal_price: 10, renewal_currency: 'TWD', renewal_cycle: 'month' }] })[0];
  assert.deepEqual(getPriceTags(node, 'zh-CN'), [{ text: '10 TWD/月' }]);
});

test('period traffic includes offline nodes and keeps missing directions unknown', () => {
  const nodes = payloadToNodes({ enabled: true, servers: [{ online: true }, { online: false }] });
  Object.assign(nodes[0], { period_traffic_up: 400, period_traffic_down: 500, net_total_up: 10, net_total_down: 20 });
  Object.assign(nodes[1], { period_traffic_up: 100, period_traffic_down: 200 });
  assert.equal(typeof nodeHelpers.sumNodeMetric, 'function');
  assert.equal(nodeHelpers.sumNodeMetric(nodes, 'period_traffic_up'), 500);
  assert.equal(nodeHelpers.sumNodeMetric(nodes, 'period_traffic_down'), 700);
  Object.assign(nodes[1], { period_traffic_down: NaN });
  assert.ok(Number.isNaN(nodeHelpers.sumNodeMetric(nodes, 'period_traffic_down')));
});

test('live records retain offline gaps so the current measurement becomes unknown', () => {
  const initial = snapshotRecord('0', { online: true, cpu_pct: 15, mem_used: 100 }, 1000)!;
  assert.equal(typeof nodeHelpers.appendLiveRecord, 'function');
  const offline = nodeHelpers.appendLiveRecord([initial], '0', null, 2000);
  assert.equal(offline.at(-1)?.cpu, null);
  assert.equal(offline.at(-1)?.ram, null);
  assert.equal(offline.at(-1)?.time, new Date(2000).toISOString());
  const resumed = nodeHelpers.appendLiveRecord(offline, '0', snapshotRecord('0', { online: true, cpu_pct: 30 }, 3000), 3000);
  assert.deepEqual(resumed.map(record => record.cpu), [15, null, 30]);
});

test('unknown Emerald measurements render as dashes and zero remains real', () => {
  assert.equal(formatBytes(NaN), '—');
  assert.deepEqual(formatBytesSplit(NaN), { value: '—', unit: '' });
  assert.equal(formatBytesPerSecond(NaN), '—');
  assert.equal(formatUptime(NaN), '—');
  assert.equal(formatUptimeWithFormat(NaN), '—');
  assert.equal(formatMetric(NaN, 1, '%'), '—');
  assert.equal(formatMetric(0, 1, '%'), '0.0%');
  assert.equal(formatBytes(0), '0 B');
});

test('billing quota uses adjusted host usage while boot counters remain independent', () => {
  const [node] = payloadToNodes({ enabled: true, servers: [{ online: true, traffic_used: 900, traffic_used_total: 800, boot_traffic_up: 10, boot_traffic_down: 20 }] });
  assert.equal(getTrafficUsed(node), 900);
  assert.equal(node.net_total_up, 10);
  assert.equal(node.net_total_down, 20);
  const [unknown] = payloadToNodes({ enabled: true, servers: [{ online: true }] });
  assert.ok(Number.isNaN(getMemPercentage(unknown)));
  assert.deepEqual(getPriceTags(unknown, 'zh-CN'), []);
});

test('public settings enable host resource history and use icon then logo', () => {
  const settings = createPublicSettings({ enabled: true, history_days: 3, icon: '/icon.svg', logo: '/logo.svg' });
  assert.equal(settings.record_enabled, true);
  assert.equal(settings.record_preserve_time, 72);
  assert.equal(settings.theme_settings?.visitorInfoCardEnabled, true);
  assert.equal(settings.theme_settings?.siteIcon, '/icon.svg');
  assert.equal(createPublicSettings({ enabled: true, logo: '/logo.svg' }).theme_settings?.siteIcon, '/logo.svg');
});

test('Emerald keeps array-index IDs, bytes and actual zero measurements', () => {
  const nodes = payloadToNodes({ enabled: true, servers: [{ online: true, name: 'A', cpu_pct: 0, mem_used: 512, mem_total: 1024, download_speed: 20, upload_speed: 30, tcp_connections: 0, boot_traffic_up: 100, cumulative_up: 999, boot_traffic_down: 200, loadavg: '0 1.5 2', renewal_cycle: 'year', renewal_price: 12, renewal_currency: 'USD' }, { online: false, name: 'A' }] });
  assert.deepEqual(nodes.map(n => n.uuid), ['0', '1']);
  assert.equal(nodes[0].ram, 512);
  assert.equal(nodes[0].cpu, 0);
  assert.equal(nodes[0].connections, 0);
  assert.equal(nodes[0].net_in, 20);
  assert.equal(nodes[0].net_out, 30);
  assert.equal(nodes[0].net_total_up, 100);
  assert.equal(nodes[0].load5, 1.5);
  assert.equal(nodes[0].billing_cycle, 365);
  assert.equal(nodes[0].price, 12);
  assert.equal(nodes[0].currency, 'USD');
});

test('Emerald leaves absent metrics unknown instead of fabricating zeros', () => {
  const [node] = payloadToNodes({ enabled: true, servers: [{ online: false }] });
  for (const key of ['cpu', 'ram', 'mem_total', 'connections', 'connections_udp', 'uptime', 'net_total_down', 'swap', 'gpu', 'load', 'price'] as const) assert.ok(Number.isNaN(node[key]), key);
  assert.equal(node.ping, undefined);
  assert.deepEqual(payloadToNodes({ enabled: true }), []);
});

test('Emerald settings preserve title and configured history without exposing admin controls', () => {
  const settings = createPublicSettings({ enabled: true, title: '我的探针', history_days: 7, show_globe: false });
  assert.equal(settings.sitename, '我的探针');
  assert.equal(settings.ping_record_preserve_time, 168);
  assert.equal(settings.theme_settings?.earthViewMode, 'hide');
  assert.equal(settings.theme_settings?.hideAdminEntryWhenLoggedOut, true);
});

test('bridge publishes updates and unsubscribes listeners', () => {
  let updates = 0;
  const unsubscribe = subscribePayload(() => updates++);
  receivePayload({ enabled: true, title: 'one' });
  assert.equal(getPayload()?.title, 'one');
  assert.equal(updates, 1);
  unsubscribe();
  receivePayload({ enabled: false });
  assert.equal(updates, 1);
});

test('host bridge rejects unrelated origins, senders and malformed payloads', () => {
  const parent = {};
  let handler: (event: any) => void = () => {};
  const host = { parent, location: { origin: 'https://probe.example' }, addEventListener: (_: string, fn: typeof handler) => { handler = fn; }, removeEventListener: () => {} };
  const cleanup = installHostBridge(host as unknown as Window);
  const send = (origin: string, source: unknown, data: unknown) => handler({ origin, source, data });
  receivePayload({ enabled: true, title: 'baseline' });
  send('https://evil.example', parent, { type: 'mmwx-probe-data', data: { enabled: true, title: 'evil' } });
  send(host.location.origin, {}, { type: 'mmwx-probe-data', data: { enabled: true, title: 'evil' } });
  send(host.location.origin, parent, { type: 'mmwx-probe-data', data: { enabled: true, servers: {} } });
  assert.equal(getPayload()?.title, 'baseline');
  send(host.location.origin, parent, { type: 'mmwx-probe-data', data: { enabled: true, title: 'valid' } });
  assert.equal(getPayload()?.title, 'valid');
  cleanup();
});
