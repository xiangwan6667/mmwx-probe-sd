import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './upstream/App';
import { ThemeProvider } from './upstream/components/ThemeProvider';
import { CommandProvider } from './upstream/context/command-provider';
import { StatusProvider } from './upstream/context/status-provider';
import { SortProvider } from './upstream/context/sort-provider';
import { TooltipProvider } from './upstream/context/tooltip-provider';
import { WebSocketContext } from './upstream/context/websocket-context';
import { toNezhaData } from './adapter';
import { receiveProbe, useProbeBridge } from './bridge';
import type { NezhaWebsocketResponse } from './upstream/types/nezha-api';
import './upstream/i18n';
import 'flag-icons/css/flag-icons.min.css';
import 'font-logos/assets/font-logos.css';
import './upstream/index.css';
import '../scrollbars.css';
import './integration.css';
import '../touch-controls.css';

const queryClient = new QueryClient();
// This entry receives data from the host; direct visits return to its public URL.
if (window.parent === window) window.location.replace(`/${window.location.hash}`);
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.source !== window.parent) return;
  if (event.data?.type === 'mmwx-probe-data' && event.data.data?.enabled) {
    receiveProbe(event.data.data, event.data.error);
    queryClient.invalidateQueries({ queryKey: ['setting'] });
    queryClient.invalidateQueries({ queryKey: ['server-group'] });
  }
  if (event.data?.type === 'mmwx-probe-route' && typeof event.data.hash === 'string' && /^#\/(server\/\d+)?$/.test(event.data.hash) && window.location.hash !== event.data.hash) window.location.hash = event.data.hash;
});
window.addEventListener('hashchange', () => window.parent.postMessage({ type: 'nezhadash-route', hash: window.location.hash }, window.location.origin));
function Root() {
  const probe = useProbeBridge();
  const data = useMemo(() => probe ? toNezhaData(probe.data) : null, [probe]);
  const [history, setHistory] = useState<NezhaWebsocketResponse[]>([]);
  useEffect(() => { if (data) setHistory(previous => [...previous.slice(-119), data]); }, [data]);
  if (!probe || !data) return <div className="min-h-screen flex items-center justify-center text-sm">正在连接主控…</div>;
  return <ThemeProvider><QueryClientProvider client={queryClient}><WebSocketContext.Provider value={{ lastData: data, connected: !probe.error, messageHistory: history, needReconnect: false, reconnect: () => {}, setNeedReconnect: () => {} }}><CommandProvider><StatusProvider><SortProvider><TooltipProvider><App /></TooltipProvider></SortProvider></StatusProvider></CommandProvider></WebSocketContext.Provider></QueryClientProvider></ThemeProvider>;
}
createRoot(document.getElementById('root')!).render(<Root />);
window.parent.postMessage({ type: 'nezhadash-ready' }, window.location.origin);
