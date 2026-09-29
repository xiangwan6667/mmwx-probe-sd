import { useEffect, useRef, useState } from "react";
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
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let stopped = false;
    let ws: WebSocket | undefined;

    const accept = (payload: ProbePayload) => {
      if (stopped) return;
      applyAppearance(payload.appearance);
      setData(payload);
      setError(undefined);
      applyProbeDocumentBranding(payload.title, payload.icon);
    };
    const poll = async () => {
      try {
        const response = await fetch("/api/probe", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        accept((await response.json()) as ProbePayload);
      } catch (cause) {
        if (!stopped)
          setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    const startPolling = () => {
      if (timer.current) return;
      void poll();
      timer.current = window.setInterval(poll, 5000);
    };

    const stopAppearanceSync = watchAppearance();
    // Keep polling as a fallback even when the WebSocket handshake succeeds.
    // Some proxies leave an idle WebSocket open without forwarding later frames,
    // which otherwise freezes realtime speed at the first snapshot.
    startPolling();
    try {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${location.host}/api/stream`);
      ws.onmessage = (event) => {
        try {
          accept(JSON.parse(event.data) as ProbePayload);
        } catch {
          /* wait for next frame */
        }
      };
      ws.onerror = startPolling;
      ws.onclose = startPolling;
    } catch {
      startPolling();
    }

    return () => {
      stopped = true;
      stopAppearanceSync();
      ws?.close();
      if (timer.current) window.clearInterval(timer.current);
      timer.current = undefined;
    };
  }, []);

  return { data, error };
}
