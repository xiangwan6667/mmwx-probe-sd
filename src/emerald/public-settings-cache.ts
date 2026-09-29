import type { ProbePayload } from '../types';
import { createPublicSettings } from './data-adapter';

/** Retain only the last configuration; live metrics never replace its identity. */
export function createPublicSettingsCache() {
  let signature = '';
  let previous: ReturnType<typeof createPublicSettings>;
  return (payload: ProbePayload, loginEnabled: boolean) => {
    const next = createPublicSettings(payload);
    next.theme_settings = { ...next.theme_settings, hideAdminEntryWhenLoggedOut: !loginEnabled };
    const nextSignature = JSON.stringify(next);
    if (nextSignature !== signature) {
      signature = nextSignature;
      previous = next;
    }
    return previous!;
  };
}
