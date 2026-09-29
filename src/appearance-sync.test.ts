import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as appearance from './use-probe';
import { readColorModePreference, saveColorModePreference, systemColorScheme } from './theme-settings';

test('system mode is the default and stays synchronized without a mounted theme menu', (t) => {
  const storage = new Map<string, string>();
  const classes = new Set<string>();
  const media = Object.assign(new EventTarget(), { matches: false });
  const page = new EventTarget();
  const doc = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    documentElement: {
      classList: {
        [Symbol.iterator]: () => classes[Symbol.iterator](),
        add: (...names: string[]) => names.forEach(name => classes.add(name)),
        remove: (...names: string[]) => names.forEach(name => classes.delete(name)),
      }, dataset: {}, style: {},
    },
  });
  for (const [key, value] of Object.entries({
    window: page, document: doc, matchMedia: () => media,
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }

  appearance.applyAppearance({ theme: 'nezha', color_mode: 'dark' });
  assert.equal(readColorModePreference(), 'system');
  assert.ok(classes.has('light'), 'master dark default must not override system light');
  const stop = appearance.watchAppearance();
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  assert.ok(classes.has('dark'), 'OS change applies immediately without polling');

  saveColorModePreference('light');
  assert.ok(classes.has('light'), 'manual selection applies immediately');
  media.dispatchEvent(new Event('change'));
  assert.ok(classes.has('light'), 'OS must not override explicit light mode');
  saveColorModePreference('system');
  assert.ok(classes.has('dark'), 'returning to system uses the current OS mode');

  media.matches = false; // Simulate a missed media event while the page is suspended.
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.ok(classes.has('light'), 'returning to a suspended page resynchronizes');
  media.matches = true;
  page.dispatchEvent(new Event('pageshow'));
  assert.ok(classes.has('dark'), 'restoring a cached page resynchronizes');
  stop();
  media.matches = false;
  media.dispatchEvent(new Event('change'));
  assert.ok(classes.has('dark'), 'cleanup removes the media listener');
});

test('embedded themes read the host OS preference instead of their inherited color scheme', (t) => {
  const physical = { matches: false };
  const inherited = { matches: true };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    parent: { matchMedia: () => physical }, matchMedia: () => inherited,
  } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'window', previous) : Reflect.deleteProperty(globalThis, 'window'));
  assert.equal(systemColorScheme(), physical);
});
