import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
export function RouteSync() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage({ type: 'nezhadash-route', hash: `#${location.pathname}` }, window.location.origin);
  }, [location.pathname]);
  return null;
}
