import { useEffect, useState } from "react";
import { startProbeTransport } from './probe-transport';
import type { ProbeAppearance, ProbePayload } from "./types";
import { applyProbeDocumentBranding } from "./document-branding";
import { resolveTheme } from "./theme-preference";
import { readColorModePreference, readThemePreference, subscribeThemeSettings, systemColorScheme } from "./theme-settings";
export { readColorModePreference, saveColorModePreference } from "./theme-settings";

const APPEARANCE_CACHE = "mmwx-probe-appearance";
let latestAppearance: ProbeAppearance | undefined;

export function applyAppearance(input?: ProbeAppearance) {
  if (input) latestAppearance = input;
  const cached = (() => {
    try {
      return JSON.parse(
        localStorage.getItem(APPEARANCE_CACHE) || "null",
      ) as ProbeAppearance | null;
    } catch {
      return null;
    }
  })();
  const appearance = input || latestAppearance || cached || { theme: "pixel", color_mode: "system" };
  const theme = resolveTheme(readThemePreference(), appearance.theme);
  const colorMode = readColorModePreference();
  const root = document.documentElement;
  for (const className of Array.from(root.classList)) {
    if (className.startsWith("theme-")) root.classList.remove(className);
  }
  root.classList.remove("light", "dark");
  root.classList.add(`theme-${theme}`);
  const dark =
    colorMode === "dark" ||
    (colorMode === "system" &&
      systemColorScheme().matches);
  root.classList.add(dark ? "dark" : "light");
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.themeReady = "true";
  if (input) {
    try {
      localStorage.setItem(APPEARANCE_CACHE, JSON.stringify(input));
    } catch {
      // Theme switching must keep working when storage is blocked.
    }
  }
}

// Always active in the host, including when the selected theme lives in an iframe.
export function watchAppearance() {
  const media = systemColorScheme();
  const sync = () => applyAppearance();
  const visible = () => { if (document.visibilityState === "visible") sync(); };
  const unsubscribe = subscribeThemeSettings(sync);
  media.addEventListener("change", sync);
  window.addEventListener("focus", sync);
  window.addEventListener("pageshow", sync);
  document.addEventListener("visibilitychange", visible);
  sync();
  return () => {
    unsubscribe();
    media.removeEventListener("change", sync);
    window.removeEventListener("focus", sync);
    window.removeEventListener("pageshow", sync);
    document.removeEventListener("visibilitychange", visible);
  };
}

export function useProbe(): { data?: ProbePayload; error?: string } {
  const [data, setData] = useState<ProbePayload>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let stopped = false;

    const accept = (payload: ProbePayload) => {
      if (stopped) return;
      applyAppearance(payload.appearance);
      setData(payload);
      setError(undefined);
      applyProbeDocumentBranding(payload.title, payload.icon);
    };
    const stopAppearanceSync = watchAppearance();
    const stopTransport = startProbeTransport(accept, message => { if (!stopped) setError(message); });

    return () => {
      stopped = true;
      stopAppearanceSync();
      stopTransport();
    };
  }, []);

  return { data, error };
}
