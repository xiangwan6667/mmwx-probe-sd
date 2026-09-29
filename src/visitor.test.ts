import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker/index';

const env = {ASSETS: {fetch: async () => new Response('asset')} as unknown as Fetcher, MMWX_ORIGIN: 'https://private.example', PROBE_TOKEN: 'secret'};
test('visitor endpoint returns only this request metadata and is never cacheable', async () => {
  const request = new Request('https://probe.example/api/visitor', {headers: {'CF-Connecting-IP': '2001:db8::1'}});
  Object.defineProperty(request, 'cf', {value: {country: 'HK', city: 'Hong Kong', asOrganization: 'Example ISP'}});
  const response = await worker.fetch(request, env);
  assert.deepEqual(await response.json(), {ip:'2001:db8::1',country:'Hong Kong',code:'HK',org:'Example ISP'});
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await worker.fetch(new Request('https://probe.example/api/visitor', {method:'POST'}), env)).status, 405);
});
test('visitor endpoint has an honest local fallback with no geolocation data', async () => {
  const response = await worker.fetch(new Request('https://probe.example/api/visitor'), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
