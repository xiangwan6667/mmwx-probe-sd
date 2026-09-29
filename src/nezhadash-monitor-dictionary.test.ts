import assert from 'node:assert/strict';
import test from 'node:test';
import { monitorDictionary } from './nezhadash/monitor-dictionary';

test('monitor labels matching prototype names remain independent chart series', () => {
  const chart = monitorDictionary<number[]>();
  for (const label of ['normal', '__proto__', 'constructor', 'toString']) {
    if (!chart[label]) chart[label] = [];
    chart[label].push(0, 12);
  }
  assert.deepEqual(Object.keys(chart), ['normal', '__proto__', 'constructor', 'toString']);
  for (const values of Object.values(chart)) assert.deepEqual(values, [0, 12]);
  assert.equal(Object.getPrototypeOf(chart), null);
});

test('monitor chart rows and configuration retain a literal __proto__ key', () => {
  const row = Object.assign(monitorDictionary<number | null>(), { created_at: 123 });
  row.__proto__ = 0;
  const reservedLabel: string = 'constructor';
  row[reservedLabel] = null;
  const config = monitorDictionary<{ label: string }>();
  config.__proto__ = { label: '__proto__' };
  assert.equal(row.__proto__, 0);
  assert.equal(row[reservedLabel], null);
  assert.deepEqual({ ...config }.__proto__, { label: '__proto__' });
});
