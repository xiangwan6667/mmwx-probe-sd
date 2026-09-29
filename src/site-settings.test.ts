import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index";
import { loadSiteSettings } from "./site-settings";

function environment(flag?: string) {
  return {
    ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
    MMWX_ORIGIN: "https://private.example.com",
    PROBE_TOKEN: "private-token",
    ENABLE_MASTER_LOGIN: flag,
  };
}

test("master login is disabled by default and only exact true enables it", async () => {
  for (const flag of [undefined, "false", "1", "TRUE", "true"]) {
    const response = await worker.fetch(new Request("https://probe.example/api/site-config"), environment(flag));
    assert.deepEqual(await response.json(), { master_login_enabled: flag === "true", nezha_background_url: '', nezha_mobile_background_url: '' });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("disabled login routes never disclose or contact the master", async () => {
  for (const path of ["/login", "/api/login/passkey/begin", "/api/login/passkey/finish", "/api/login/passkey/unknown"]) {
    const response = await worker.fetch(new Request(`https://probe.example${path}`), environment());
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("location"), null);
  }
});

test("enabled login redirects and passkey routes retain their POST requirement", async () => {
  const env = environment("true");
  const redirect = await worker.fetch(new Request("https://probe.example/login"), env);
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "https://private.example.com/login");
  const auth = await worker.fetch(new Request("https://probe.example/api/login/passkey/begin"), env);
  assert.equal(auth.status, 405);
});

test("frontend shares one runtime settings request across consumers", async (context) => {
  let requests = 0;
  context.mock.method(globalThis, "fetch", async (path: string) => {
    assert.equal(path, "/api/site-config");
    requests += 1;
    return Response.json({ master_login_enabled: true, nezha_background_url: 'https://images.example/bg.jpg', nezha_mobile_background_url: '/mobile.webp' });
  });
  const [first, second] = await Promise.all([loadSiteSettings(), loadSiteSettings()]);
  assert.deepEqual(first, { master_login_enabled: true, nezha_background_url: 'https://images.example/bg.jpg', nezha_mobile_background_url: '/mobile.webp' });
  assert.deepEqual(second, first);
  assert.equal(requests, 1);
});

test('background runtime variables are public URLs, never executable CSS or credentials', async () => {
  for (const [input, expected] of [
    [' https://images.example/bg.jpg ', 'https://images.example/bg.jpg'],
    ['/background.webp', '/background.webp'],
    ['javascript:alert(1)', ''], ['//other.example/bg.jpg', ''],
    ['https://user:password@images.example/bg.jpg', ''],
    ['https://images.example/bg.jpg);color:red', 'https://images.example/bg.jpg);color:red'],
    ['', ''],
  ]) {
    const env = { ...environment(), NEZHA_BACKGROUND_URL: input, NEZHA_MOBILE_BACKGROUND_URL: '/phone.jpg' };
    const response = await worker.fetch(new Request('https://probe.example/api/site-config'), env);
    const body = await response.json() as Record<string, unknown>;
    assert.equal(body.nezha_background_url, expected);
    assert.equal(body.nezha_mobile_background_url, '/phone.jpg');
    assert.equal(body.PROBE_TOKEN, undefined);
    assert.equal(body.MMWX_ORIGIN, undefined);
  }
});
