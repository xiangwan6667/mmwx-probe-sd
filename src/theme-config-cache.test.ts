import assert from 'node:assert/strict';
import test from 'node:test';
import { nezhaConfigSignatures } from './nezhadash/config-signature';
import { createPublicSettingsCache } from './emerald/public-settings-cache';
import { createRequestCache } from './nezhadash/request-cache';
import type { ProbePayload } from './types';

const initial: ProbePayload = { enabled: true, title: 'Monitor', history_days: 1, servers: [{ online: true, name: 'A', region: 'HK', cpu_pct: 1 }] };
test('Nezha config ignores live metrics and geography but responds to title', () => {
  const original = nezhaConfigSignatures(initial);
  assert.deepEqual(nezhaConfigSignatures({ ...initial, servers: [{ ...initial.servers![0], cpu_pct: 90 }] }), original);
  assert.notEqual(nezhaConfigSignatures({ ...initial, title: 'Changed' }).setting, original.setting);
  assert.equal(nezhaConfigSignatures({ ...initial, servers: [{ ...initial.servers![0], region: 'US' }] }).groups, original.groups);
  assert.deepEqual(nezhaConfigSignatures({ ...initial, history_days: 7 }), original); // These queries do not expose retention.
});
test('Emerald reuses configuration until title, retention, globe, icon or login changes', () => {
  const read = createPublicSettingsCache();
  const original = read(initial, false);
  assert.equal(read({ ...initial, servers: [{ ...initial.servers![0], cpu_pct: 90 }] }, false), original);
  for (const patch of [{ title: 'Changed' }, { history_days: 7 }, { show_globe: false }, { icon: '/new.svg' }]) {
    assert.notEqual(read({ ...initial, ...patch }, false), original);
    read(initial, false);
  }
  assert.equal(read(initial, true).theme_settings?.hideAdminEntryWhenLoggedOut, false);
});
test('history cache deduplicates, expires, evicts oldest entries, and retries failures', async () => {
  let time = 0;
  let calls = 0;
  const cache = createRequestCache<number>(5000, 64, () => time);
  const load = async () => ++calls;
  assert.equal(cache('a', load), cache('a', load));
  assert.equal(await cache('a', load), 1);
  time = 5000;
  assert.equal(await cache('a', load), 2);
  for (let i = 0; i < 64; i++) await cache(String(i), load);
  assert.equal(await cache('a', load), 67);
  await assert.rejects(cache('fail', async () => { throw new Error('failed'); }));
  assert.equal(await cache('fail', async () => 123), 123);
});
