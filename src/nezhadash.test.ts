import { formatBytes, percentage, selectServers, summarizeNetwork } from './nezhadash/model';
import type { ProbeServer } from './types';

function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}
const servers: ProbeServer[] = [
  { online: true, name: '香港 B', region: '香港', cpu_pct: 0, upload_speed: 0 },
  { online: false, name: '美国', region: '美国', cpu_pct: 80, upload_speed: 999 },
  { online: true, name: '香港 A', region: '香港', cpu_pct: 50, upload_speed: 1024 },
  { online: true, name: '未知' },
];
equal(selectServers(servers, { sort: 'cpu', descending: true }).map(row => row.index), [1, 2, 0, 3], 'descending puts missing last and keeps original API index');
equal(selectServers(servers, { sort: 'cpu' }).map(row => row.index), [0, 2, 1, 3], 'zero sorts before positive and missing');
equal(selectServers(servers, { status: 'online', region: '香港', query: ' a ', sort: 'name' }).map(row => row.index), [2], 'filters compose and case-insensitive search trims whitespace');
equal(servers[0].name, '香港 B', 'sorting never mutates probe order');
equal(percentage(undefined, 100), undefined, 'missing usage is unknown');
equal(percentage(0, 100), 0, 'zero usage is real');
equal(percentage(1, 0), undefined, 'zero capacity is unknown');
equal(formatBytes(undefined), '—', 'missing bytes');
equal(formatBytes(0), '0 B', 'zero bytes');
equal(formatBytes(1024), '1 KiB', 'binary byte units');
equal(summarizeNetwork(servers), { upload: 1024, download: undefined, partialUpload: true, partialDownload: true }, 'exclude stale offline speeds and mark partial reports');
equal(summarizeNetwork([]), { upload: undefined, download: undefined, partialUpload: false, partialDownload: false }, 'empty network is unknown');
