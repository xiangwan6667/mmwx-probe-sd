import assert from 'node:assert/strict';
import { test } from 'node:test';
import { receiveProbe } from './nezhadash/bridge';
import { fetchServerMetrics } from './nezhadash/upstream/lib/nezha-api';

test('historical charts receive CPU, memory, network and connection samples for every period', async (t) => {
  receiveProbe({ enabled: true, servers: [{ name: 'History server', online: true }], history_days: 1 });
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return Response.json({ success: true, bucket_sec: 300, generated_at: 1800000300, series: {
      cpu_pct: [{ t: 1800000000, value: 0 }, { t: 1800000300, value: 12.5 }, { t: 1800000600, value: null }],
      mem_used: [{ t: 1800000000, value: 536870912 }],
      mem_total: [{ t: 1800000000, value: 2147483648 }],
      upload_speed: [{ t: 1800000000, value: 1048576 }],
      download_speed: [{ t: 1800000000, value: 2097152 }],
      tcp_connections: [{ t: 1800000000, value: 106 }],
      udp_connections: [{ t: 1800000000, value: 4 }],
    } });
  });
  for (const period of ['1h', '6h', '24h'] as const) {
    const metrics = await Promise.all((['cpu', 'memory', 'net_out_speed', 'net_in_speed', 'tcp_conn', 'udp_conn', 'disk'] as const)
      .map(metric => fetchServerMetrics(0, metric, period)));
    assert.deepEqual(metrics.map(result => result.data.data_points), [
      [{ ts: 1800000000000, value: 0 }, { ts: 1800000300000, value: 12.5 }],
      [{ ts: 1800000000000, value: 536870912 }],
      [{ ts: 1800000000000, value: 1048576 }],
      [{ ts: 1800000000000, value: 2097152 }],
      [{ ts: 1800000000000, value: 106 }],
      [{ ts: 1800000000000, value: 4 }],
      [], // Never fabricate historical disk usage from the current snapshot.
    ]);
  }
  assert.deepEqual(urls, ['1h', '6h', '24h'].map(range => `/api/series?server=0&range=${range}&metric=system`));
});
