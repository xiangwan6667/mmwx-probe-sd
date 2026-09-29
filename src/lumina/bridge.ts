import type { ProbePayload } from '../types';

let payload: ProbePayload | null = null;
const listeners = new Set<(payload: ProbePayload, error?: string | null) => void>();

export function getPayload(): ProbePayload | null { return payload; }

export function subscribePayload(listener: (payload: ProbePayload, error?: string | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function receivePayload(data: ProbePayload, error?: string | null): void {
  payload = data;
  listeners.forEach(listener => listener(data, error));
}

/** Only the embedding public host can provide data; this bridge performs no requests. */
export function installHostBridge(host: Window = window): () => void {
  const receive = (event: MessageEvent) => {
    if (event.origin !== host.location.origin || event.source !== host.parent) return;
    const message = event.data;
    const data = message?.data;
    if (message?.type !== 'mmwx-probe-data' || !data || typeof data.enabled !== 'boolean') return;
    if (data.servers !== undefined && (!Array.isArray(data.servers) || data.servers.some((server: unknown) => !server || typeof server !== 'object' || typeof (server as { online?: unknown }).online !== 'boolean'))) return;
    receivePayload(data, typeof message.error === 'string' ? message.error : null);
  };
  host.addEventListener('message', receive);
  return () => host.removeEventListener('message', receive);
}
