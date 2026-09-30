import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

function bootstrap(values: Record<string, string>, systemDark = false, parentMode?: 'light' | 'dark', blocked = false) {
  const classes = new Set<string>();
  const root = { classList: { add: (...names: string[]) => names.forEach(name => classes.add(name)) }, style: {} as Record<string, string>, dataset: {} as Record<string, string> };
  const window = { matchMedia: () => ({ matches: systemDark }), parent: {} as unknown };
  window.parent = parentMode ? { document: { documentElement: { classList: { contains: (name: string) => name === parentMode } } } } : window;
  const source = readFileSync(new URL('../public/appearance-init.js', import.meta.url), 'utf8');
  runInNewContext(source, { document: { documentElement: root }, window, localStorage: { getItem: (key: string) => { if (blocked) throw new Error('Storage blocked'); return values[key] ?? null; } } });
  return { classes, root };
}

test('restore persisted Nezha colors before application scripts or data arrive', () => {
  const { classes, root } = bootstrap({ 'mmwx-probe-theme': 'nezha', 'mmwx-probe-color-mode': 'dark' });
  assert(classes.has('theme-nezha'));
  assert(classes.has('dark'));
  assert.equal(root.style.colorScheme, 'dark');
  assert.equal(root.style.backgroundColor, 'hsl(30 15% 8%)');
});

test('follow cached host theme and resolve system color independently of the server default', () => {
  const { classes, root } = bootstrap({ 'mmwx-probe-appearance': JSON.stringify({ theme: 'nezhadash', color_mode: 'dark' }) });
  assert(classes.has('theme-nezha'));
  assert(classes.has('light'));
  assert.equal(root.style.backgroundColor, 'hsl(0 0% 98%)');
});

test('embedded startup uses the host effective mode when storage cannot retain a preference', () => {
  const { classes, root } = bootstrap({}, false, 'dark', true);
  assert(classes.has('dark'));
  assert.equal(root.style.colorScheme, 'dark');
});

test('invalid cached settings and blocked storage still resolve system mode', () => {
  for (const blocked of [false, true]) {
    const { classes } = bootstrap({ 'mmwx-probe-theme': 'bad theme', 'mmwx-probe-color-mode': 'invalid', 'mmwx-probe-appearance': '{' }, true, undefined, blocked);
    assert(classes.has('theme-pixel'));
    assert(classes.has('dark'));
  }
});
