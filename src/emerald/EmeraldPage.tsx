import { useEffect, useRef, useState } from 'react';
import type { ProbePayload } from '../types';

export default function EmeraldPage({ data, error }: { data: ProbePayload; error?: string | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({data,error});
  latest.current = {data,error};
  const [source] = useState(() => {
    const id = /^#\/server\/(\d+)$/.exec(window.location.hash)?.[1];
    return `/emerald/index.html#/${id === undefined ? '' : `instance/${id}`}`;
  });
  const send = () => frame.current?.contentWindow?.postMessage({ type:'mmwx-probe-data', ...latest.current }, window.location.origin);
  useEffect(() => { send(); }, [data,error]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'emerald-ready') send();
      if (event.data?.type === 'emerald-route' && typeof event.data.hash === 'string' && /^#\/(server\/\d+)?$/.test(event.data.hash)) {
        if (location.hash !== event.data.hash) history.replaceState(null, '', `${location.pathname}${location.search}${event.data.hash}`);
      }
    };
    const route = () => frame.current?.contentWindow?.postMessage({type:'mmwx-probe-route',hash:location.hash},location.origin);
    window.addEventListener('message', receive);
    window.addEventListener('hashchange', route);
    return () => { window.removeEventListener('message', receive); window.removeEventListener('hashchange', route); };
  }, []);
  return <iframe ref={frame} title="Emerald 服务器监控" src={source} onLoad={send} style={{display:'block',width:'100%',height:'100dvh',border:0}} />;
}
