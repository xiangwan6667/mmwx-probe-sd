import assert from 'node:assert/strict';
import test from 'node:test';
import { billableTraffic } from './traffic-display';
import * as trafficDisplay from './traffic-display';
import { payloadToNodes } from './emerald/data-adapter';
import { payloadToNodes as luminaNodes, payloadToRealtime } from './lumina/data-adapter';
import { toNezhaData } from './nezhadash/adapter';
import type { ProbePayload } from './types';

const payload: ProbePayload = { enabled: true, servers: [
  { online: true, traffic_used: 950, traffic_used_up: 400, traffic_used_down: 500,
    traffic_used_total: 900, boot_traffic_up: 10, boot_traffic_down: 20,
    upload_speed: 3, download_speed: 4, period_start: '2026-09-01', period_end: '2026-10-01' },
  { online: false, traffic_used: 200, traffic_used_up: 100, traffic_used_down: 200,
    boot_traffic_up: 30, boot_traffic_down: 40, upload_speed: 99, download_speed: 99 },
] };

test('ported themes carry cycle directions separately from boot counters and billed usage', () => {
  for (const nodes of [payloadToNodes(payload), luminaNodes(payload)]) {
    assert.equal(nodes[0].period_traffic_up, 400);
    assert.equal(nodes[0].period_traffic_down, 500);
    assert.equal(nodes[0].billable_traffic_used, 950);
    assert.equal(nodes[0].net_total_up, 10);
    assert.equal(nodes[0].net_total_down, 20);
    assert.equal(nodes[0].traffic_usage_label, '本周期计费用量');
  }
  assert.equal(payloadToRealtime(payload)['0'].network.totalUp, 10);
  assert.equal(toNezhaData(payload).servers[0].state.net_out_transfer, 10);
});

test('traffic summary includes offline cycle usage and only online speeds', () => {
  assert.deepEqual(trafficDisplay.summarizeTraffic(payload.servers!), {
    uplink: 500, downlink: 700, used: 1150, uploadSpeed: 3, downloadSpeed: 4,
  });
});

test('missing cycle data remains unknown even when boot counters are available', () => {
  const servers = [{ online: true, boot_traffic_up: 10, boot_traffic_down: 20 }];
  const result = trafficDisplay.summarizeTraffic(servers);
  for (const value of Object.values(result)) assert.ok(Number.isNaN(value));
  const [node] = payloadToNodes({ enabled: true, servers });
  assert.ok(Number.isNaN(node.period_traffic_up));
  assert.ok(Number.isNaN(node.billable_traffic_used));
  assert.equal(billableTraffic({ online: true, traffic_used_total: 300 }), undefined);
});

test('billing reconstruction applies mode and explicit adjustment, never raw total alone', () => {
  for (const [traffic_stats_mode, expected] of [
    ['both', 330], ['upload', 130], ['download', 230], ['max', 230],
  ] as const) {
    assert.equal(billableTraffic({ online: true, traffic_used_up: 100, traffic_used_down: 200,
      traffic_used_total: 300, traffic_stats_mode, traffic_adjustment: 30 }), expected);
  }
  assert.equal(billableTraffic({ online: true, traffic_used: 0, traffic_used_total: 300 }), 0);
  assert.equal(billableTraffic({ online: true, traffic_used_up: 100, traffic_used_down: 200,
    traffic_stats_mode: 'both' }), undefined);
});

test('real zero traffic survives summaries and partial totals cannot masquerade as complete', () => {
  const zero = { online: false, traffic_used: 0, traffic_used_up: 0, traffic_used_down: 0 };
  assert.deepEqual(trafficDisplay.summarizeTraffic([zero]), {
    uplink: 0, downlink: 0, used: 0, uploadSpeed: 0, downloadSpeed: 0,
  });
  const incomplete = trafficDisplay.summarizeTraffic([zero, { online: true, traffic_used_up: 2,
    traffic_used_down: 3, upload_speed: 0, download_speed: 0 }]);
  assert.equal(incomplete.uplink, 2);
  assert.equal(incomplete.downlink, 3);
  assert.ok(Number.isNaN(incomplete.used));
});

test('Nezha preserves missing measurements instead of inventing zero', () => {
  const [missing, zero] = toNezhaData({ enabled: true, servers: [
    { online: true },
    { online: true, cpu_pct: 0, mem_used: 0, mem_total: 1024, disk_used: 0,
      disk_total: 1024, uptime: 0, upload_speed: 0, download_speed: 0,
      tcp_connections: 0, udp_connections: 0, loadavg: '0 0 0' },
  ] }).servers;
  for (const field of ['cpu', 'mem_used', 'disk_used', 'uptime', 'net_in_speed',
    'net_out_speed', 'tcp_conn_count', 'udp_conn_count', 'process_count', 'load_1'] as const) {
    assert.ok(Number.isNaN(missing.state[field]), `missing ${field}`);
    if (field !== 'process_count') assert.equal(zero.state[field], 0, `zero ${field}`);
  }
  assert.ok(Number.isNaN(missing.host.mem_total));
  assert.ok(Number.isNaN(missing.host.boot_time));
});

test('Nezha renders complete cycle totals including real zero and hides unavailable totals', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: ServerOverview } = await import('./nezhadash/upstream/components/ServerOverview');
  const { StatusContext } = await import('./nezhadash/upstream/context/status-context');
  const { receiveProbe } = await import('./nezhadash/bridge');
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: { CustomBackgroundImage: '' } });
  try {
    const render = (servers: NonNullable<ProbePayload['servers']>) => {
      receiveProbe({ enabled: true, servers });
      return renderToStaticMarkup(createElement(StatusContext.Provider,
        { value: { status: 'all', setStatus: () => {} } }, createElement(ServerOverview,
          { online: 1, offline: 0, total: servers.length, up: 0, down: 0, upSpeed: 0, downSpeed: 0 })));
    };
    assert.match(render(payload.servers!), /周期流量/);
    assert.match(render([{ online: true, traffic_used: 0, traffic_used_up: 0,
      traffic_used_down: 0, upload_speed: 0, download_speed: 0 }]), /计费用量 0 KiB/);
    assert.doesNotMatch(render([{ online: true }]), /周期流量|计费用量/);
    assert.match(render(payload.servers!), /周期流量/);
  } finally {
    Object.assign(globalThis, { window: previousWindow });
  }
});
