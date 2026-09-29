import { useSyncExternalStore } from 'react';
import type { ProbePayload } from '../types';
let snapshot: { data: ProbePayload; error?: string | null } | null = null;
const listeners = new Set<() => void>();
export function receiveProbe(data: ProbePayload, error?: string | null) {
  snapshot = { data, error };
  listeners.forEach(listener => listener());
}
export function getProbe() {
  if (!snapshot) throw new Error('等待主页面数据');
  return snapshot.data;
}
export function useProbeBridge() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => snapshot);
}
