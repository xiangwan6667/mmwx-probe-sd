import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { applyAppearance } from './use-probe';
import { saveColorModePreference } from './theme-settings';

test('embedded startup hands off the host preference when browser storage is blocked', () => {
  const classes = new Set<string>();
  const root = {
    classList: {
      [Symbol.iterator]: () => classes[Symbol.iterator](),
      add: (...names: string[]) => names.forEach(name => classes.add(name)),
      remove: (...names: string[]) => names.forEach(name => classes.delete(name)),
    },
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
  };
  const parentRoot = { dataset: { colorModePreference: 'dark' }, classList: { contains: (name: string) => name === 'dark' } };
  const document = { documentElement: root };
  const window = { parent: { document: { documentElement: parentRoot }, matchMedia: () => ({ matches: false }) }, matchMedia: () => ({ matches: false }) };
  const localStorage = { getItem: () => { throw new Error('Storage blocked'); }, setItem: () => { throw new Error('Storage blocked'); } };
  Object.assign(globalThis, { document, window, localStorage });
  runInNewContext(readFileSync(new URL('../public/appearance-init.js', import.meta.url), 'utf8'), { document, window, localStorage });
  assert(classes.has('dark'));
  applyAppearance();
  assert(classes.has('dark'), 'runtime must retain the host preference');
  assert.equal(root.style.backgroundColor, '', 'loaded theme CSS takes over the canvas');
  assert.equal(root.dataset.appearanceBoot, undefined);

  parentRoot.dataset.colorModePreference = 'light';
  applyAppearance();
  assert(classes.has('light'), 'host changes remain visible to the embedded page');
  saveColorModePreference('dark');
  applyAppearance();
  assert(classes.has('dark'), 'a local in-memory choice still overrides the inherited preference');
  saveColorModePreference('system');
  applyAppearance();
  assert(classes.has('light'), 'system mode continues to resolve from the host media query');
});
