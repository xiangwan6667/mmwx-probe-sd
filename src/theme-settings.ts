import { useSyncExternalStore } from "react";
import {
  normalizeColorMode,
  normalizeThemePreference,
  type ProbeColorMode,
  type ProbeThemePreference,
} from "./theme-preference";

const THEME_KEY = "mmwx-probe-theme";
const COLOR_KEY = "mmwx-probe-color-mode";
// Keep changes usable for this visit even if browser storage is unavailable.
const unsaved = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (unsaved.has(key)) return unsaved.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    unsaved.delete(key);
  } catch {
    unsaved.set(key, value);
  }
  listeners.forEach((listener) => listener());
}

function syncStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== THEME_KEY && event.key !== COLOR_KEY)
    return;
  if (event.key === null) unsaved.clear();
  else unsaved.delete(event.key);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", syncStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0)
      window.removeEventListener("storage", syncStorage);
  };
}

export function readThemePreference(): ProbeThemePreference {
  return normalizeThemePreference(read(THEME_KEY));
}

export function saveThemePreference(theme: ProbeThemePreference) {
  save(THEME_KEY, normalizeThemePreference(theme));
}

export function readColorModePreference(
  fallback?: ProbeColorMode,
): ProbeColorMode {
  return normalizeColorMode(read(COLOR_KEY), normalizeColorMode(fallback));
}

export function saveColorModePreference(mode: ProbeColorMode) {
  save(COLOR_KEY, normalizeColorMode(mode));
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, readThemePreference);
}

export function useColorModePreference(fallback?: ProbeColorMode) {
  return useSyncExternalStore(subscribe, () =>
    readColorModePreference(fallback),
  );
}
