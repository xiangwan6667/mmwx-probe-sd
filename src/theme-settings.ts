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

export function subscribeThemeSettings(listener: () => void) {
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

export function readColorModePreference(): ProbeColorMode {
  return normalizeColorMode(read(COLOR_KEY));
}

// Embedded documents can inherit the parent's forced color-scheme. Read the
// host media query so choosing system never resolves against that stale scheme.
export function systemColorScheme(): MediaQueryList {
  try {
    if (window.parent !== window) return window.parent.matchMedia("(prefers-color-scheme: dark)");
  } catch {
    // Standalone tests or cross-origin embedding use the current document.
  }
  return matchMedia("(prefers-color-scheme: dark)");
}

export function saveColorModePreference(mode: ProbeColorMode) {
  save(COLOR_KEY, normalizeColorMode(mode));
}

export function useThemePreference() {
  return useSyncExternalStore(subscribeThemeSettings, readThemePreference);
}

export function useColorModePreference() {
  return useSyncExternalStore(subscribeThemeSettings, readColorModePreference);
}
