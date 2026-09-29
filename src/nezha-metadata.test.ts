import assert from 'node:assert/strict';
import test from 'node:test';
import { toNezhaData } from './nezhadash/adapter';
import type { ProbeServer } from './types';

const note = (server: Partial<ProbeServer>) => JSON.parse(toNezhaData({enabled: true, servers: [{online: true, ...server}]}).servers[0].public_note || '{}');

test('Nezha cards receive real price, expiry and route tags without fabricated IP flags', () => {
  const data = note({renewal_price: 69, renewal_currency: 'CNY', renewal_cycle: 'month', expires_at: '2026-10-31T00:00:00Z', traffic_limit: 1024 ** 4,
    return_routes: [{carrier: 'telecom', route_type: 'CN2GIA'}, {carrier: 'unicom', route_type: '10099'}, {carrier: 'mobile', route_type: 'CMIN'}]});
  assert.equal(data.billingDataMod.amount, '¥69');
  assert.equal(data.billingDataMod.cycle, '月');
  assert.equal(data.billingDataMod.autoRenewal, '0');
  assert.equal(data.billingDataMod.startDate, '2026-09-30T00:00:00.000Z');
  assert.equal(data.planDataMod.trafficVol, '1 TiB');
  assert.match(data.planDataMod.extra, /green:CN2GIA/);
  assert.match(data.planDataMod.extra, /green:10099/);
  assert.match(data.planDataMod.extra, /gray:CMI/);
  assert.equal(data.planDataMod.IPv4, '');
});

test('missing, zero, permanent and expired metadata retain their meaning', () => {
  assert.equal(toNezhaData({enabled: true, servers: [{online:true}]}).servers[0].public_note, '{}');
  assert.deepEqual(note({}), {});
  assert.equal(note({renewal_price: 0}).billingDataMod.amount, '0');
  assert.equal(note({renewal_cycle: 'permanent'}).billingDataMod.endDate, '0000-00-00');
  const expired = note({expires_at: '2020-01-01T00:00:00Z', renewal_cycle: 'two_year'});
  assert.equal(expired.billingDataMod.endDate, '2020-01-01T00:00:00.000Z');
  assert.equal(expired.billingDataMod.startDate, '2018-01-01T00:00:00.000Z');
  assert.deepEqual(note({expires_at: 'invalid', traffic_limit: -1, renewal_price: NaN}), {});
});
