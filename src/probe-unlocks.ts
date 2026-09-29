import type { ProbePayload, ProbeUnlock } from './types';
import { groupUnlocks, isUnlocked, UNLOCK_CATEGORIES, unlockServiceMeta, unlockStatusMeta, unlockStatusText, unlockTitle } from './unlock-services';

export function allUnlocked(unlocks: ProbeUnlock[]): boolean {
  return unlocks.length > 0 && unlocks.every(item => item.status === 'yes');
}

/** Presentation-neutral data; each theme owns its components and appearance. */
export function unlockSections(unlocks: ProbeUnlock[]) {
  const groups = groupUnlocks(unlocks);
  return UNLOCK_CATEGORIES.map(category => ({
    ...category,
    count: groups[category.key].filter(item => isUnlocked(item.status)).length,
    rows: groups[category.key].map(item => {
      const meta = unlockServiceMeta(item.service);
      return { key: item.service, meta, tone: meta.info ? 'info' : unlockStatusMeta(item.status).tone,
        text: unlockStatusText(item, true), title: unlockTitle(item, true) };
    }),
  }));
}

const EMPTY: ProbeUnlock[] = [];
/** Array-index IDs are the public API identity; names need not be unique. */
export function serverUnlocks(payload: ProbePayload | undefined | null, id: string | number): ProbeUnlock[] {
  if (!payload?.enabled || !/^(0|[1-9]\d*)$/.test(String(id))) return EMPTY;
  return payload.servers?.[Number(id)]?.unlocks ?? EMPTY;
}
