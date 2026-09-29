// Reused from the official MMWX probe; shared by React and Vue theme adapters.
import { useState } from 'react';
import { CircleHelp, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import type { ProbeUnlock } from './types';
import { groupUnlocks, isUnlocked, UNLOCK_CATEGORIES, unlockServiceMeta, unlockStatusMeta, unlockStatusText, unlockTitle, type UnlockCategory, type UnlockServiceMeta, type UnlockTone } from './unlock-services';

export function UnlockServiceIcon({ meta }: { meta: UnlockServiceMeta }) {
  if (meta.icon) {
    return (
      <svg
        aria-hidden="true"
        className="unlock-badge-brand"
        role="img"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d={meta.icon.path} />
      </svg>
    );
  }
  return (
    <span aria-hidden="true" className="unlock-badge-letter">
      {meta.short}
    </span>
  );
}

export function UnlockStateIcon({ tone }: { tone: UnlockTone }) {
  if (tone === "ok" || tone === "partial") {
    return <LockKeyholeOpen aria-hidden="true" className="unlock-badge-lock" />;
  }
  if (tone === "muted") {
    return <CircleHelp aria-hidden="true" className="unlock-badge-lock" />;
  }
  return <LockKeyhole aria-hidden="true" className="unlock-badge-lock" />;
}

export function UnlockTabbedList({
  unlocks,
  className,
}: {
  unlocks: ProbeUnlock[];
  className?: string;
}) {
  const [tab, setTab] = useState<UnlockCategory>("streaming");
  const groups = groupUnlocks(unlocks);
  return (
    <div className={className ? `unlock-list ${className}` : "unlock-list"}>
      <div className="unlock-tabs">
        {UNLOCK_CATEGORIES.map((c) => {
          const list = groups[c.key];
          const ok = list.filter((u) => isUnlocked(u.status)).length;
          return (
            <button
              key={c.key}
              type="button"
              data-active={tab === c.key || undefined}
              onClick={() => setTab(c.key)}
            >
              {c.zh}
              <small>
                {ok}/{list.length}
              </small>
            </button>
          );
        })}
      </div>
      <div className="unlock-category-panels">
      {UNLOCK_CATEGORIES.map(category => <div key={category.key} className="unlock-category-panel" style={{ visibility: tab === category.key ? 'visible' : 'hidden' }} aria-hidden={tab !== category.key} inert={tab !== category.key}>
      {groups[category.key].length === 0 ? (
        <p className="unlock-empty">—</p>
      ) : (
        <ul>
          {groups[category.key].map((u) => {
            const meta = unlockServiceMeta(u.service);
            const st = unlockStatusMeta(u.status);
            return (
              <li key={u.service} title={unlockTitle(u, true)}>
                <UnlockServiceIcon meta={meta} />
                <span className="unlock-row-label">{meta.label}</span>
                <span
                  className="unlock-row-status"
                  data-tone={meta.info ? "info" : st.tone}
                >
                  <span>{unlockStatusText(u, true)}</span>
                  {!meta.info && <UnlockStateIcon tone={st.tone} />}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      </div>)}
      </div>
    </div>
  );
}
