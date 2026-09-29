import type { ProbeServer } from '../types';

export type StatusFilter = 'all' | 'online' | 'offline';
export type SortKey = 'default' | 'name' | 'cpu' | 'memory' | 'disk' | 'upload' | 'download';
export const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'default', label: '默认排序' }, { value: 'name', label: '名称' },
  { value: 'cpu', label: 'CPU' }, { value: 'memory', label: '内存' },
  { value: 'disk', label: '硬盘' }, { value: 'upload', label: '上传速度' },
  { value: 'download', label: '下载速度' },
];
export function numeric(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}
export function percentage(used?: number, total?: number): number | undefined {
  return numeric(used) !== undefined && numeric(total) !== undefined && total! > 0
    ? used! / total! * 100 : undefined;
}
export function formatBytes(value?: number): string {
  if (numeric(value) === undefined) return '—';
  if (value === 0) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const exponent = Math.max(0, Math.min(Math.floor(Math.log(value!) / Math.log(1024)), units.length - 1));
  return `${Number((value! / 1024 ** exponent).toFixed(1))} ${units[exponent]}`;
}
export function formatSpeed(value?: number): string {
  return numeric(value) === undefined ? '—' : `${formatBytes(value)}/s`;
}
export function formatUptime(value?: number): string {
  if (numeric(value) === undefined) return '—';
  const days = Math.floor(value! / 86400);
  const hours = Math.floor(value! % 86400 / 3600);
  return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时 ${Math.floor(value! % 3600 / 60)} 分钟`;
}
export function serverRegion(server: ProbeServer): string {
  return server.region?.trim() || server.region_name?.trim() || server.region_country?.trim() || '';
}
function sortValue(server: ProbeServer, key: SortKey): number | undefined {
  switch (key) {
    case 'cpu': return numeric(server.cpu_pct);
    case 'memory': return percentage(server.mem_used, server.mem_total);
    case 'disk': return percentage(server.disk_used, server.disk_total);
    case 'upload': return numeric(server.upload_speed);
    case 'download': return numeric(server.download_speed);
    default: return undefined;
  }
}
export function selectServers(servers: ProbeServer[], options: {
  status?: StatusFilter; region?: string; query?: string; sort?: SortKey; descending?: boolean;
} = {}) {
  const query = options.query?.trim().toLocaleLowerCase() || '';
  const sort = options.sort ?? 'default';
  return servers.map((server, index) => ({ server, index })).filter(({ server, index }) => {
    const status = options.status || 'all';
    const searchable = [server.name || `服务器 ${index + 1}`, serverRegion(server), server.provider_name, server.os].join(' ').toLocaleLowerCase();
    return (status === 'all' || server.online === (status === 'online'))
      && (!options.region || serverRegion(server) === options.region)
      && searchable.includes(query);
  }).sort((a, b) => {
    const direction = options.descending ? -1 : 1;
    if (sort === 'default') return direction * (a.index - b.index);
    if (sort === 'name') return direction * (a.server.name || `服务器 ${a.index + 1}`).localeCompare(b.server.name || `服务器 ${b.index + 1}`, 'zh-CN', { numeric: true }) || a.index - b.index;
    const left = sortValue(a.server, sort), right = sortValue(b.server, sort);
    if (left === undefined || right === undefined) return left === right ? a.index - b.index : left === undefined ? 1 : -1;
    return direction * (left - right) || a.index - b.index;
  });
}
export function summarizeNetwork(servers: ProbeServer[]) {
  const online = servers.filter(server => server.online);
  const uploads = online.map(server => numeric(server.upload_speed)).filter((v): v is number => v !== undefined);
  const downloads = online.map(server => numeric(server.download_speed)).filter((v): v is number => v !== undefined);
  return {
    upload: uploads.length ? uploads.reduce((a, b) => a + b, 0) : undefined,
    download: downloads.length ? downloads.reduce((a, b) => a + b, 0) : undefined,
    partialUpload: uploads.length < online.length,
    partialDownload: downloads.length < online.length,
  };
}
