import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './upstream/App';
import { MotionProvider } from './upstream/components/motion/motion-provider';
import { ThemeColorManager } from './upstream/components/ThemeColorManager';
import { ThemeProvider } from './upstream/components/ThemeProvider';
import { CommandProvider } from './upstream/context/command-provider';
import { StatusProvider } from './upstream/context/status-provider';
import { SortProvider } from './upstream/context/sort-provider';
import { TooltipProvider } from './upstream/context/tooltip-provider';
import { WebSocketContext } from './upstream/context/websocket-context';
import { toNezhaData } from './adapter';
import { nezhaConfigSignatures } from './config-signature';
import { receiveProbe, useProbeBridge } from './bridge';
import type { NezhaWebsocketResponse } from './upstream/types/nezha-api';
import { loadSiteSettings } from '../site-settings';
import './upstream/i18n';
import 'flag-icons/css/flag-icons.min.css';
import 'font-logos/assets/font-logos.css';
import './upstream/index.css';
import '../scrollbars.css';
import './integration.css';
import '../touch-controls.css';

const queryClient = new QueryClient();
let configSignatures: ReturnType<typeof nezhaConfigSignatures> | undefined;
// This entry receives data from the host; direct visits return to its public URL.
if (window.parent === window) window.location.replace(`/${window.location.hash}`);
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.source !== window.parent) return;
  if (event.data?.type === 'mmwx-probe-data' && event.data.data?.enabled) {
    const height = event.data.backgroundViewportHeight;
    if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
      document.documentElement.style.setProperty('--nezha-viewport-height', `${height}px`);
    }
    receiveProbe(event.data.data, event.data.error);
    const nextSignatures = nezhaConfigSignatures(event.data.data);
    if (nextSignatures.setting !== configSignatures?.setting) void queryClient.invalidateQueries({ queryKey: ['setting'] });
    if (nextSignatures.groups !== configSignatures?.groups) void queryClient.invalidateQueries({ queryKey: ['server-group'] });
    configSignatures = nextSignatures;
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
  return <MotionProvider><ThemeProvider><ThemeColorManager /><QueryClientProvider client={queryClient}><WebSocketContext.Provider value={{ lastData: data, lastMessage: { data: JSON.stringify(data) }, connected: !probe.error, messageHistory: history.map(item => ({ data: JSON.stringify(item) })), needReconnect: false, reconnect: () => {}, setNeedReconnect: () => {} }}><CommandProvider><StatusProvider><SortProvider><TooltipProvider><App /></TooltipProvider></SortProvider></StatusProvider></CommandProvider></WebSocketContext.Provider></QueryClientProvider></ThemeProvider></MotionProvider>;
}
// Initialize upstream background globals before mounting its components.
void loadSiteSettings().then(settings => {
  window.CustomBackgroundImage = settings.nezha_background_url;
  window.CustomMobileBackgroundImage = settings.nezha_mobile_background_url || settings.nezha_background_url;
  try { sessionStorage.removeItem('savedBackgroundImage'); } catch { /* Storage may be disabled. */ }
  createRoot(document.getElementById('root')!).render(<Root />);
  window.parent.postMessage({ type: 'nezhadash-ready' }, window.location.origin);
});
