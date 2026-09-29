import { useEffect, useRef, useState } from 'react';
import type { ProbePayload } from '../types';

/** Own document preserves upstream Tailwind/preflight without changing other themes. */
export default function NezhaDashPage({ data, error }: {
  data: ProbePayload; error?: string | null;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [source] = useState(() => `/nezhadash/index.html${/^#\/server\/\d+$/.test(window.location.hash) ? window.location.hash : '#/'}`);
  const latest = useRef({ data, error });
  latest.current = { data, error };
  const send = () => frame.current?.contentWindow?.postMessage({ type: 'mmwx-probe-data', ...latest.current }, window.location.origin);
  useEffect(() => { send(); }, [data, error]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'nezhadash-ready') send();
      if (event.data?.type === 'nezhadash-route' && typeof event.data.hash === 'string' && /^#\/(server\/\d+)?$/.test(event.data.hash)) {
        if (window.location.hash !== event.data.hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${event.data.hash}`);
      }
    };
    const route = () => frame.current?.contentWindow?.postMessage({ type: 'mmwx-probe-route', hash: window.location.hash }, window.location.origin);
    window.addEventListener('message', receive);
    window.addEventListener('hashchange', route);
    return () => { window.removeEventListener('message', receive); window.removeEventListener('hashchange', route); };
  }, []);
  return <iframe ref={frame} title="Nezha 服务器监控" src={source} onLoad={send} style={{ display: 'block', width: '100%', height: '100dvh', border: 0 }} />;
}
