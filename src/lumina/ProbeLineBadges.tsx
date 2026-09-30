import { useSyncExternalStore } from 'react';
import { getPayload, subscribePayload } from './bridge';
import { cardRouteLines } from './data-adapter';

/** Live labels use the same public payload as the host, without extra requests. */
export function ProbeLineBadges({ uuid }: { uuid: string }) {
  const payload = useSyncExternalStore(subscribePayload, getPayload);
  const lines = payload ? cardRouteLines(payload, uuid) : [];
  if (!lines.length) return null;
  return <div className="probe-line-badges" aria-label="三网回程线路">
    {lines.length ? lines.map(line => {
      return <span className="probe-line-badge" key={line.key} title={[line.name+'回程',line.route,line.region,line.testedAt&&`探测时间 ${line.testedAt}`].filter(Boolean).join(' · ')}>
        <span className="probe-line-name">{line.name}</span>
        <strong>{line.route}</strong>
      </span>;
    }) : null}
  </div>;
}
