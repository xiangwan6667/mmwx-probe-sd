import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker/index';

const env = {
  ASSETS: { fetch: async () => new Response('asset') } as unknown as Fetcher,
  MMWX_ORIGIN: 'https://master.example', PROBE_TOKEN: 'worker-secret', ENABLE_MASTER_LOGIN: 'true',
};
const request = (path: string) => new Request(`https://probe.example${path}`, {
  method: path.startsWith('/api/login/') ? 'POST' : 'GET',
  headers: { Origin: 'https://probe.example' },
});

test('all upstream routes reject unsafe or invalid configured origins without fetching', async context => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({}); });
  for (const origin of ['invalid', 'http://master.example', 'ftp://localhost', 'https://user:pass@master.example']) {
    for (const path of ['/api/probe', '/api/login/passkey/begin', '/login']) {
      const response = await worker.fetch(request(path), { ...env, MMWX_ORIGIN: origin });
      assert.equal(response.status, 502);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('location'), null);
    }
  }
  assert.equal(calls, 0);
});

test('auth redirects are rejected without forwarding credentials or redirect details', async context => {
  const requests: Request[] = [];
  context.mock.method(globalThis, 'fetch', async (upstream: Request) => {
    requests.push(upstream);
    return new Response('private redirect body', { status: 307, headers: { Location: 'https://private.example' } });
  });
  const incoming = request('/api/login/passkey/finish');
  for (const header of ['cookie', 'authorization', 'x-mmwx-probe-token']) incoming.headers.set(header, 'browser-secret');
  const response = await worker.fetch(incoming, env);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].redirect, 'manual');
  for (const header of ['cookie', 'authorization', 'x-mmwx-probe-token']) assert.equal(requests[0].headers.get(header), null);
  assert.equal(requests[0].headers.get('x-forwarded-host'), 'probe.example');
  assert.equal(requests[0].headers.get('x-forwarded-proto'), 'https');
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /private/);
});

test('rewritten auth JSON drops stale representation metadata', async context => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({ token: 'valid' }, { headers: {
    'content-length': '17', 'content-encoding': 'gzip', etag: 'old', 'content-md5': 'old', 'set-cookie': 'session=private',
  } }));
  const response = await worker.fetch(request('/api/login/passkey/finish'), env);
  assert.equal(response.status, 200);
  for (const header of ['content-length', 'content-encoding', 'etag', 'content-md5', 'set-cookie']) assert.equal(response.headers.get(header), null);
  assert.match(response.headers.get('content-type')!, /application\/json/);
  assert.deepEqual(await response.json(), { token: 'valid', master_origin: env.MMWX_ORIGIN });
});

test('upstream network failures produce generic uncached gateway responses', async context => {
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('private upstream hostname'); });
  for (const path of ['/api/probe', '/api/login/passkey/begin']) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await response.text(), /private/);
  }
});

test('HTTP loopback development origins and websocket responses remain supported', async context => {
  const websocket = new Response(null);
  Object.defineProperty(websocket, 'webSocket', { value: {} });
  context.mock.method(globalThis, 'fetch', async () => websocket);
  for (const origin of ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://[::1]:8080']) {
    assert.equal(await worker.fetch(request('/api/stream'), { ...env, MMWX_ORIGIN: origin }), websocket);
  }
});
