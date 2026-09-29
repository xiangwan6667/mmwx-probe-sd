import type { ProbePayload, ProbeServer } from './types';

const carriers = [{ key: 'telecom', name: '电信' }, { key: 'unicom', name: '联通' }, { key: 'mobile', name: '移动' }] as const;
const premiumRoutes = new Set(['CN2GIA', 'CTGGIA', '9929', 'CMIN2', '163PP']);

/** Keep carrier order and route names identical across all imported themes. */
export function serverRouteLines(server: ProbeServer) {
  if (!server.return_routes?.length) return [];
  return carriers.map(({ key, name }) => {
    const result = server.return_routes?.find(route => route.carrier === key);
    const raw = result?.route_type?.trim();
    let route = raw && !/^(unknown|未知)$/i.test(raw) ? raw.toUpperCase() : '未知';
    if (route === 'CMIN') route = 'CMI';
    if (route === '163' && key === 'telecom' && server.telecom_paid_peer) route = '163PP';
    return { key, name, route, premium: premiumRoutes.has(route.replace(/[^A-Z0-9]/g, '')), region: result?.region, testedAt: result?.tested_at };
  });
}

export function cardRouteLines(payload: ProbePayload, uuid: string) {
  if (!payload.enabled || !/^(0|[1-9]\d*)$/.test(uuid)) return [];
  const server = payload.servers?.[Number(uuid)];
  return server ? serverRouteLines(server) : [];
}
