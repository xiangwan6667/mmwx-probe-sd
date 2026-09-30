import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h, type Ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createPinia, disposePinia } from 'pinia';
import { createServer } from 'vite';
import { mapSystemHistory, snapshotRecord } from './emerald/history';

test('Emerald CPU chart follows available load samples across history and live updates', async () => {
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
    cacheDir: 'node_modules/.vite-emerald-load-test',
    optimizeDeps: { noDiscovery: true, entries: [] },
    server: { middlewareMode: true },
    appType: 'custom',
  });
  const pinia = createPinia();
  try {
    const { default: LoadChart } = await server.ssrLoadModule('/src/emerald/upstream/components/LoadChart.vue');
    type Record = ReturnType<typeof mapSystemHistory>[number];
    let state!: {
      remoteData: Ref<Record[]>;
      cpuChartOption: Ref<{ yAxis: unknown[]; series: Array<{ name: string; data: Array<number | null> }> }>;
    };
    const app = createSSRApp({
      setup() {
        state = LoadChart.setup({ uuid: '0' }, { expose() {} });
        return () => h('div');
      },
    });
    app.use(pinia);
    await renderToString(app);
    const history = mapSystemHistory('0', { series: { cpu_pct: [{ t: 300, value: 0 }, { t: 600, value: null }] } });
    state.remoteData.value = history;
    assert.equal(state.cpuChartOption.value.yAxis.length, 1, 'missing historical load must not create an axis');
    assert.deepEqual(state.cpuChartOption.value.series.map(s => s.name), ['CPU']);
    assert.deepEqual(state.cpuChartOption.value.series[0]?.data, [0, null]);

    const zeroLoad = snapshotRecord('0', { online: true, cpu_pct: 20, loadavg: '0 0 0' }, 900000)!;
    state.remoteData.value = [zeroLoad, history[1]!];
    assert.equal(state.cpuChartOption.value.yAxis.length, 2, 'a real zero load needs its axis');
    assert.deepEqual(state.cpuChartOption.value.series.map(s => s.name), ['CPU', '负载']);
    assert.deepEqual(state.cpuChartOption.value.series[1]?.data, [0, null], 'missing load stays a gap');

    state.remoteData.value = [{ ...zeroLoad, load: Number.NaN }, { ...zeroLoad, load: Infinity }];
    assert.equal(state.cpuChartOption.value.yAxis.length, 1);
    assert.deepEqual(state.cpuChartOption.value.series.map(s => s.name), ['CPU']);
    state.remoteData.value = history;
    assert.equal(state.cpuChartOption.value.yAxis.length, 1);
  } finally {
    disposePinia(pinia);
    await server.close();
    keys.forEach((key, index) => {
      if (previous[index]) Object.defineProperty(globalThis, key, previous[index]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
