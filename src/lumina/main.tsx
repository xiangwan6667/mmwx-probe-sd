import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './upstream/styles/index.css';
import '../scrollbars.css';
import './host-theme.css';
import { App } from './upstream/App';
import { router } from './upstream/router';
import { queryClient } from './upstream/services/queryClient';
import { getPayload, installHostBridge, subscribePayload } from './bridge';

installHostBridge();
let mounted = false;
let publicSignature = '';
let lastTrafficRefresh = 0;
function mount() {
  if (mounted || !getPayload()) return;
  mounted = true;
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
}
subscribePayload((payload) => {
  // Task identity and assignment change theme settings; metric samples do not.
  const nextPublicSignature = JSON.stringify([
    payload.title,
    payload.history_days,
    payload.enabled,
    payload.tri_isp,
    payload.servers?.map(server => server.ping?.map(series => [series.key, series.label])),
  ]);
  if (!mounted) {
    publicSignature = nextPublicSignature;
    lastTrafficRefresh = Date.now();
    mount();
  }
  else {
    if (publicSignature !== nextPublicSignature) {
      publicSignature = nextPublicSignature;
      void queryClient.invalidateQueries({ queryKey: ['public'] });
    }
    if (Date.now() - lastTrafficRefresh >= 30_000) {
      lastTrafficRefresh = Date.now();
      void queryClient.invalidateQueries({ queryKey: ['traffic-stats'] });
    }
  }
});
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (event.data?.type !== 'mmwx-probe-route') return;
  const hash = event.data.hash;
  if (typeof hash !== 'string' || !/^#\/(server\/\d+)?$/.test(hash)) return;
  const path = hash.replace(/^#\/server\//, '/instance/').replace(/^#/, '');
  if (router.state.location.pathname !== path) void router.navigate(path);
});
router.subscribe(({ location: route }) => {
  if (route.pathname !== '/' && !/^\/instance\/\d+$/.test(route.pathname)) return;
  const hash = '#' + route.pathname.replace('/instance/', '/server/');
  parent.postMessage({ type: 'lumina-route', hash }, location.origin);
});
parent.postMessage({ type: 'lumina-ready' }, location.origin);
mount();
