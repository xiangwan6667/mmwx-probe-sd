import assert from 'node:assert/strict';
import test from 'node:test';
import { cardRouteLines, serverRouteLines } from './probe-route-lines';

test('imported themes share carrier order, route aliases and non-premium 10099', () => {
  const server = { online: true, telecom_paid_peer: true, return_routes: [
    { carrier: 'mobile' as const, route_type: 'CMIN' },
    { carrier: 'unicom' as const, route_type: '10099' },
    { carrier: 'telecom' as const, route_type: '163' },
  ] };
  assert.deepEqual(serverRouteLines(server).map(line => [line.name, line.route, line.premium]),
    [['电信', '163PP', true], ['联通', '10099', false], ['移动', 'CMI', false]]);
  assert.deepEqual(serverRouteLines({ online: true }), []);
  assert.deepEqual(cardRouteLines({ enabled: false, servers: [server] }, '0'), []);
  assert.deepEqual(cardRouteLines({ enabled: true, servers: [server] }, ''), []);
  assert.deepEqual(serverRouteLines({ online: true, return_routes: [{ carrier: 'mobile', route_type: 'unknown' }] }).map(line => line.route), ['未知', '未知', '未知']);
});
