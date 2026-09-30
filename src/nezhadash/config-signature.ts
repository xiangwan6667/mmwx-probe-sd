import type { ProbePayload } from '../types';
import { toNezhaGroups } from './adapter';
import { DEFAULT_PROBE_ICON } from '../document-branding';

export function nezhaConfigSignatures(data: ProbePayload) {
  return {
    setting: JSON.stringify([data.title || '服务器状态', data.icon?.trim() || DEFAULT_PROBE_ICON]),
    groups: JSON.stringify(toNezhaGroups(data)),
  };
}
