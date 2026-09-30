import assert from 'node:assert/strict';
import test from 'node:test';
import { receiveProbe } from './nezhadash/bridge';
import { fetchSetting } from './nezhadash/upstream/lib/nezha-api';
import { DEFAULT_PROBE_ICON } from './document-branding';

test('Nezha settings expose the current host icon and restore the shared fallback when removed', async () => {
  for (const [icon, expected] of [
    ['/first.svg', '/first.svg'],
    ['  /second.svg  ', '/second.svg'],
    ['', DEFAULT_PROBE_ICON],
    [undefined, DEFAULT_PROBE_ICON],
  ]) {
    receiveProbe({ enabled: true, title: 'Monitor', icon });
    const config = (await fetchSetting()).data.config;
    assert.equal(config.site_icon, expected);
  }
});
