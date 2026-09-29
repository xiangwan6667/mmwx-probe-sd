import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBytes, formatFixed, formatByteRateLabel, formatTrafficRateLabel } from './lumina/upstream/utils/format';
import { computeTrafficUsed, resolveTrafficUsage } from './lumina/upstream/utils/traffic';

test('Lumina distinguishes missing measurements from real zero', () => {
  for (const missing of [NaN, Infinity, -Infinity]) {
    assert.equal(formatBytes(missing), '—');
    assert.equal(formatFixed(missing, 2), '—');
    assert.equal(formatByteRateLabel(missing), '—');
    assert.equal(formatTrafficRateLabel(missing), '—');
  }
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatFixed(0, 2), '0.00');
  assert.equal(formatByteRateLabel(0), '0 B/s');
});

test('Lumina cumulative traffic does not invent missing usage or quota', () => {
  assert.ok(Number.isNaN(computeTrafficUsed('sum', NaN, 20)));
  assert.ok(Number.isNaN(computeTrafficUsed('max', NaN, 20)));
  assert.equal(computeTrafficUsed('down', NaN, 20), 20);
  assert.equal(computeTrafficUsed('sum', 0, 20), 20);
  const missing = resolveTrafficUsage('sum', NaN, 20, NaN);
  assert.equal(missing.unlimited, false);
  assert.ok(Number.isNaN(missing.used));
  assert.ok(Number.isNaN(missing.remaining));
  assert.equal(resolveTrafficUsage('sum', 0, 20, 0).unlimited, true);
});

test('Lumina quota uses adjusted billable usage independently of boot counters', () => {
  const traffic = resolveTrafficUsage('sum', 3, 8, 20, 12);
  assert.equal(traffic.used, 12);
  assert.equal(traffic.remaining, 8);
  assert.equal(traffic.fraction, 0.6);
  assert.equal(resolveTrafficUsage('sum', 3, 8, 20, NaN).used, 11);
});

import { normalizeBillingCycle, formatRenewalPrice } from './lumina/upstream/utils/billing';
import { calculateCostSummary, formatCnyMoney } from './lumina/upstream/utils/cost';
import type { NodeInfo } from './lumina/upstream/types/komari';
test('Lumina missing billing periods and expiry stay incomplete', () => {
  assert.ok(Number.isNaN(normalizeBillingCycle('NaN').days));
  assert.ok(Number.isNaN(normalizeBillingCycle('').days));
  assert.equal(formatRenewalPrice({ price: 4, currency: '€', billing_cycle: 'NaN' }), '€4 · 周期缺失');
  const node = { uuid: 'missing-expiry', name: 'Unknown expiry', price: 4, currency: 'CNY', billing_cycle: '30', expired_at: '' } as NodeInfo;
  const summary = calculateCostSummary([node], [], {});
  assert.equal(summary.details[0].note, '期限缺失');
  assert.equal(summary.details[0].counted, false);
  assert.equal(formatCnyMoney(summary.remainingCny), '—');
  assert.equal(formatCnyMoney(summary.monthlyCny), '—');
});

import { getTrafficResetDisplay } from './lumina/upstream/utils/trafficReset';
test('Lumina reset hint requires an explicit future traffic period end', () => {
  const now = new Date(2026, 8, 29, 12).getTime();
  assert.equal(getTrafficResetDisplay(undefined, now), null);
  assert.equal(getTrafficResetDisplay('2026-08-30', now), null);
  const reset = getTrafficResetDisplay('2026-10-15', now);
  assert.ok(reset?.title.includes('2026-10-15'));
  assert.ok(!reset?.title.includes('每月'));
});
