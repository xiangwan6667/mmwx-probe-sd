import type { ProbePayload } from '../types';
import { toNezhaGroups } from './adapter';

export function nezhaConfigSignatures(data: ProbePayload) {
  return {
    setting: data.title || '服务器状态',
    groups: JSON.stringify(toNezhaGroups(data)),
  };
}
