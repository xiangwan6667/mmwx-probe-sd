import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia, disposePinia } from 'pinia';
import { createServer } from 'vite';
import { payloadToNodes } from './emerald/data-adapter';
import type { ProbeServer } from './types';

test('Emerald renders the master billed total and retains usage when raw directions or quota are absent', async () => {
  const keys = ['window', 'localStorage', 'matchMedia'] as const;
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const storage = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
  Object.assign(globalThis, {
    localStorage: storage,
    window: { addEventListener() {}, removeEventListener() {}, localStorage: storage },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  const server = await createServer({
    configFile: 'vite.config.ts',
    cacheDir: 'node_modules/.vite-emerald-overview-test',
    optimizeDeps: { noDiscovery: true, entries: [] },
    server: { middlewareMode: true },
    appType: 'custom',
  });
  try {
    const { default: Card } = await server.ssrLoadModule('/src/emerald/upstream/components/NodeGeneralCards.vue');
    const render = async (servers: ProbeServer[]) => {
      const pinia = createPinia();
      try {
        const app = createSSRApp(Card, { nodes: payloadToNodes({ enabled: true, servers }) });
        app.use(pinia);
        return await renderToString(app);
      } finally {
        disposePinia(pinia);
      }
    };
    const html = await render([
      { online: true, traffic_used: 1024 ** 4, traffic_limit: 20 * 1024 ** 4, traffic_used_up: 11.35 * 1024 ** 4, traffic_used_down: 1.43 * 1024 ** 4 },
      { online: false, traffic_used: 0.93 * 1024 ** 4, traffic_limit: 22.48 * 1024 ** 4, traffic_used_up: 0, traffic_used_down: 0 },
    ]);
    const card = html.match(/已用流量[\s\S]*?>\s*1\.93\s*<[\s\S]*?>\s*TB\s*</);
    assert.ok(card, 'the visible used-traffic card contains the billed amount, including offline usage');
    assert.doesNotMatch(html, /12\.78/);
    assert.match(await render([{ online: true, traffic_used: 0 }]), /已用流量[\s\S]*?>\s*0\s*</);
    assert.match(await render([{ online: true, traffic_used: 1024 ** 4 }]), /已用流量[\s\S]*?>\s*1\.00\s*</);
    assert.doesNotMatch(await render([{ online: true, traffic_used_up: 10, traffic_used_down: 20 }]), /已用流量/);
    assert.doesNotMatch(await render([{ online: true, traffic_used: 1 }, { online: false }]), /已用流量/);
  } finally {
    await server.close();
    keys.forEach((key, index) => {
      if (previous[index]) Object.defineProperty(globalThis, key, previous[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
