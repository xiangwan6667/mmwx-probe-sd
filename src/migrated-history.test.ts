import assert from 'node:assert/strict';
import test from 'node:test';
import { joinMetricSeries } from './nezhadash/measurements';

test('independent historical directions retain zero and do not fabricate missing samples', () => {
  const rows = joinMetricSeries([{ ts: 2, value: 0 }], [{ ts: 1, value: 3 }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].right, 3);
  assert.ok(Number.isNaN(rows[0].left));
  assert.equal(rows[1].left, 0);
  assert.ok(Number.isNaN(rows[1].right));
});
import { mapSystemHistory, snapshotRecord } from './emerald/history';
import { toNezhaData } from './nezhadash/adapter';
import { formatBytes } from './nezhadash/upstream/lib/format';

test('resource history maps upstream cumulative byte counters and preserves zero and missing samples', () => {
  const records = mapSystemHistory('0', { success: true, series: {
    cumulative_up: [{ t: 300, value: 0 }, { t: 600, value: 1024 }],
    cumulative_down: [{ t: 300, value: 2048 }, { t: 600, value: null }],
  } });
  assert.equal(records.length, 2);
  assert.equal(records[0].time, '1970-01-01T00:05:00.000Z');
  assert.equal(records[0].net_total_up, 0);
  assert.equal(records[0].net_total_down, 2048);
  assert.equal(records[1].net_total_up, 1024);
  assert.equal(records[1].net_total_down, null);
});

test('live resource history keeps boot counters independent of raw period traffic', () => {
  const record = snapshotRecord('0', { online: true, boot_traffic_up: 0,
    cumulative_up: 123, boot_traffic_down: 20, traffic_used_up: 999 }, 300000)!;
  assert.equal(record.net_total_up, 0);
  assert.equal(record.net_total_down, 20);
});

test('Nezha unknown boot traffic does not render as measured zero', () => {
  const [server] = toNezhaData({ enabled: true, servers: [{ online: true }] }).servers;
  assert.ok(Number.isNaN(server.state.net_out_transfer));
  assert.ok(Number.isNaN(server.state.net_in_transfer));
  assert.equal(formatBytes(NaN), '—');
  assert.equal(formatBytes(0), '0 Bytes');
});
