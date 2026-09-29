import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker/index';

const env = {
  ASSETS: { fetch: async () => new Response('asset') } as unknown as Fetcher,
  MMWX_ORIGIN: 'https://master.example',
  PROBE_TOKEN: 'worker-only-secret',
};

test('probe routes reject cross-origin and source-less requests before contacting upstream', async context => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ servers: [] }); });
  for (const path of ['probe', 'series', 'stream', 'forward']) {
    const rejectedHeaders: Record<string, string>[] = [
      {},
      { Origin: 'https://other.example' },
      { Origin: 'null' },
      { Referer: 'https://probe.example.evil/page' },
      { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://probe.example' },
      { 'Sec-Fetch-Site': 'same-origin', Origin: 'https://other.example' },
    ];
    for (const headers of rejectedHeaders) {
      const response = await worker.fetch(new Request(`https://probe.example/api/${path}`, { headers }), env);
      assert.equal(response.status, 404, `${path}: ${JSON.stringify(headers)}`);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }
  assert.equal(calls, 0);
});

test('same-origin fetch and websocket handshakes use only the Worker secret', async context => {
  const requests: Request[] = [];
  context.mock.method(globalThis, 'fetch', async (request: Request) => {
    requests.push(request);
    return Response.json({ servers: [] }, { headers: {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'true',
      'Set-Cookie': 'private=value',
    } });
  });
  const allowedHeaders: Record<string, string>[] = [
    { 'Sec-Fetch-Site': 'same-origin' },
    { Origin: 'https://probe.example' },
    { Referer: 'https://probe.example/emerald/index.html' },
    { Origin: 'https://probe.example', Upgrade: 'websocket' },
  ];
  for (const headers of allowedHeaders) {
    const response = await worker.fetch(new Request('https://probe.example/api/probe?server=0', { headers: {
      ...headers, Cookie: 'session=secret', Authorization: 'Bearer browser', 'X-MMwx-Probe-Token': 'browser-forged',
    } }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  for (const request of requests) {
    assert.equal(request.headers.get('X-MMwx-Probe-Token'), env.PROBE_TOKEN);
    assert.equal(request.headers.get('Cookie'), null);
    assert.equal(request.headers.get('Authorization'), null);
    assert.equal(request.redirect, 'manual');
    assert.equal(request.url, 'https://master.example/api/public/probe-servers?server=0');
  }
});

test('upstream redirects cannot carry the secret to another host or reveal master location', async context => {
  context.mock.method(globalThis, 'fetch', async () => Response.redirect('https://redirect.example/private', 302));
  const response = await worker.fetch(new Request('https://probe.example/api/probe', { headers: { Origin: 'https://probe.example' } }), env);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('location'), null);
});
