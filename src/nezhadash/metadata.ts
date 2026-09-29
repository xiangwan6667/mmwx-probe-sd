import type { ProbeServer } from '../types';

const cycles = {
  month: { label: '月', months: 1 }, quarter: { label: '季', months: 3 },
  half_year: { label: '半年', months: 6 }, year: { label: '年', months: 12 },
  two_year: { label: '两年', months: 24 }, three_year: { label: '三年', months: 36 },
  permanent: { label: '永久', months: 0 },
};

/** Fill the upstream metadata contract using only public MMWX fields. */
export function toPublicNote(server: ProbeServer): string {
  const cycle = server.renewal_cycle ? cycles[server.renewal_cycle] : undefined;
  const permanent = server.renewal_cycle === 'permanent';
  const expiry = server.expires_at ? new Date(server.expires_at) : undefined;
  const end = expiry && Number.isFinite(expiry.getTime()) ? expiry : undefined;
  const price = server.renewal_price;
  const hasPrice = typeof price === 'number' && Number.isFinite(price) && price >= 0;
  const currency = server.renewal_currency?.trim().toUpperCase();
  const symbol = currency ? ({CNY:'¥', USD:'$', EUR:'€', GBP:'£', JPY:'JP¥', HKD:'HK$'}[currency] ?? `${currency} `) : '';
  let startDate = '';
  if (end && cycle?.months) {
    // Infer the beginning of the current renewal cycle, clamping month ends.
    const start = new Date(end);
    const day = start.getUTCDate();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - cycle.months);
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, lastDay));
    startDate = start.toISOString();
  }
  const billingDataMod = hasPrice || end || permanent ? {
    amount: hasPrice ? price === 0 ? '0' : `${symbol}${price}` : '',
    cycle: cycle?.label ?? '', autoRenewal: '0', startDate,
    endDate: permanent ? '0000-00-00' : end?.toISOString() ?? '',
  } : undefined;

  const routes = new Map((server.return_routes ?? []).map(route => [route.carrier, route]));
  const premium = new Set(['CN2GIA', 'CTGGIA', '9929', '10099', 'CMIN2', '163PP']);
  const extra = (['telecom', 'unicom', 'mobile'] as const).flatMap(carrier => {
    const raw = routes.get(carrier)?.route_type?.trim();
    if (!raw || /^(unknown|未知)$/i.test(raw)) return [];
    let text = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!text) return [];
    if (text === 'CMIN') text = 'CMI';
    if (text === '163' && carrier === 'telecom' && server.telecom_paid_peer) text = '163PP';
    return [`${premium.has(text) ? 'green' : 'gray'}:${text}`];
  }).join(',');
  const limit = server.traffic_limit;
  let trafficVol = '';
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const unit = Math.max(0, Math.min(5, Math.floor(Math.log(limit) / Math.log(1024))));
    trafficVol = `${Number((limit / 1024 ** unit).toFixed(2))} ${units[unit]}`;
  }
  const planDataMod = trafficVol || extra ? {
    bandwidth: '', trafficVol, trafficType: '', IPv4: '', IPv6: '', networkRoute: '', extra,
  } : undefined;
  // An explicit empty object clears upstream's cached note when the master
  // removes metadata or reuses a server's array index.
  return JSON.stringify({billingDataMod, planDataMod});
}
