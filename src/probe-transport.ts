import type { ProbePayload } from './types';

function isPayload(value: unknown): value is ProbePayload {
  if (!value || typeof value !== 'object') return false;
  const data = value as ProbePayload;
  return typeof data.enabled === 'boolean' && (data.servers === undefined ||
    Array.isArray(data.servers) && data.servers.every(server => server && typeof server.online === 'boolean'));
}

/** One stream with a serial HTTP fallback when no valid frame arrives for 15s. */
export function startProbeTransport(accept: (data: ProbePayload) => void, fail: (error: string) => void) {
  let stopped = false;
  let socket: WebSocket | undefined;
  let lastFrame = -Infinity;
  let frameVersion = 0;
  let pending: AbortController | undefined;
  const poll = async () => {
    if (stopped || pending || document.visibilityState === 'hidden' || Date.now() - lastFrame < 15000) return;
    const controller = new AbortController();
    pending = controller;
    const version = frameVersion;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/probe', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      if (!isPayload(payload)) throw new Error('探针数据格式无效');
      if (!stopped && !controller.signal.aborted && version === frameVersion) accept(payload);
    } catch (error) {
      if (!stopped && version === frameVersion) fail(controller.signal.aborted ? '探针请求超时' : error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
      if (pending === controller) pending = undefined;
    }
  };
  const refresh = () => { void poll(); };
  refresh();
  const timer = setInterval(refresh, 5000);
  document.addEventListener('visibilitychange', refresh);
  try {
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/stream`);
    socket.onmessage = event => {
      if (stopped) return;
      try {
        const payload: unknown = JSON.parse(event.data);
        if (!isPayload(payload)) return;
        frameVersion++;
        lastFrame = Date.now();
        pending?.abort();
        accept(payload);
      } catch { /* Invalid frames do not suppress HTTP recovery. */ }
    };
    const disconnected = () => { lastFrame = -Infinity; refresh(); };
    socket.onerror = disconnected;
    socket.onclose = disconnected;
  } catch { /* The already-running HTTP fallback handles unsupported sockets. */ }
  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', refresh);
    pending?.abort();
    if (socket) {
      socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
    }
  };
}
