import assert from 'node:assert/strict';
import test from 'node:test';
import { payloadToNodes } from './emerald/data-adapter';
import { calculateConvertedFinance, getStoredFinanceCurrency, getDailyExchangeRates } from './emerald/upstream/utils/financeHelper';

test('finance summary converts every currency instead of selecting one subtotal', () => {
  const nodes = payloadToNodes({ enabled:true, servers:[
    {online:true,renewal_price:100,renewal_currency:'USD',renewal_cycle:'month',expires_at:'2026-10-16T00:00:00Z'},
    {online:true,renewal_price:50,renewal_currency:'GBP',renewal_cycle:'year',expires_at:'2026-10-16T00:00:00Z'},
    {online:true,renewal_price:700,renewal_currency:'CNY',renewal_cycle:'month',expires_at:'2026-10-16T00:00:00Z'},
  ]});
  const now = new Date('2026-10-01T00:00:00Z');
  const rates = {CNY:1, USD:1/7, GBP:1/9};
  const cny = calculateConvertedFinance(nodes,'CNY',rates,true,now);
  assert.equal(cny.total,1850);
  assert.ok(Math.abs(cny.monthly!-(1400+450*30/365))<1e-8);
  assert.ok(Math.abs(cny.remaining!-(700+450*15/365))<1e-8);
  const usd = calculateConvertedFinance(nodes,'USD',rates,true,now);
  assert.ok(Math.abs(usd.total!-1850/7)<1e-8);
  assert.equal(getStoredFinanceCurrency(),'USD');
});

test('missing exchange rates never produce a partial total disguised as a full total', () => {
  const nodes=payloadToNodes({enabled:true,servers:[{online:true,renewal_price:5,renewal_currency:'GBP',renewal_cycle:'month'}]});
  assert.equal(calculateConvertedFinance(nodes,'USD',{USD:0.14,CNY:1}).total,null);
  assert.equal(calculateConvertedFinance(nodes,'GBP',{}).total,5);
  assert.equal(calculateConvertedFinance(nodes,'GBP',{}).remaining,null);
});

test('exchange rates accept a partial valid currency list and fall back on an empty response', async t => {
  let calls=0;
  t.mock.method(globalThis,'fetch',async () => Response.json(++calls===1 ? {rates:{}} : {rates:{USD:0.14,GBP:0.11,CNY:1}}));
  const result=await getDailyExchangeRates();
  assert.equal(calls,2);
  assert.equal(result.source,'network');
  assert.deepEqual(result.rates,{CNY:1,GBP:0.11,USD:0.14});
});
