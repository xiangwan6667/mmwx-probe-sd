import assert from 'node:assert/strict';
import test from 'node:test';
import { hasCustomBackground } from './nezhadash/background-state';

test('Nezha glass surfaces activate only when a background image is configured', () => {
  assert.equal(hasCustomBackground('', ''), false);
  assert.equal(hasCustomBackground('/background.webp', ''), true);
  assert.equal(hasCustomBackground('', 'https://images.example/mobile.webp'), true);
});
