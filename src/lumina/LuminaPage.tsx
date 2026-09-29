import { useEffect, useRef, useState } from 'react';
import type { ProbePayload } from '../types';

export default function LuminaPlusPage({ data, error }: { data: ProbePayload; error?: string | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({data,error});
  latest.current = {data,error};
  const [source] = useState(() => {
    const id = /^#\/server\/(\d+)$/.exec(window.location.hash)?.[1];
    return `/lumina/index.html#/${id === undefined ? '' : `instance/${id}`}`;
  });
  const send = () => frame.current?.contentWindow?.postMessage({ type:'mmwx-probe-data', ...latest.current }, window.location.origin);
  useEffect(() => { send(); }, [data,error]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'lumina-ready') send();
      if (event.data?.type === 'lumina-route' && typeof event.data.hash === 'string' && /^#\/(server\/\d+)?$/.test(event.data.hash)) {
        if (location.hash !== event.data.hash) history.replaceState(null, '', `${location.pathname}${location.search}${event.data.hash}`);
      }
    };
    const route = () => frame.current?.contentWindow?.postMessage({type:'mmwx-probe-route',hash:location.hash},location.origin);
    window.addEventListener('message', receive);
    window.addEventListener('hashchange', route);
    return () => { window.removeEventListener('message', receive); window.removeEventListener('hashchange', route); };
  }, []);
  return <>
    <iframe ref={frame} title="LuminaPlus 服务器监控" src={source} onLoad={send} style={{display:'block',width:'100%',height:'100dvh',border:0}} />
    {error && <div role="status" title={error} style={{position:'fixed',bottom:12,left:'50%',transform:'translateX(-50%)',zIndex:1000,padding:'8px 14px',borderRadius:8,background:'#7f1d1d',color:'#fff',fontSize:12}}>主控连接中断，正在显示最近数据</div>}
  </>;
}
