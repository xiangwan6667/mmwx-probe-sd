import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  saveColorModePreference,
  systemColorScheme,
  useColorModePreference,
} from "../../../theme-settings";
import { subscribeMediaQuery } from "@lumina/utils/mediaQuery";

const subscribeSystem = (listener: () => void) => {
  const unsubscribe = subscribeMediaQuery(systemColorScheme(), listener);
  window.addEventListener("focus", listener);
  window.addEventListener("pageshow", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    unsubscribe();
    window.removeEventListener("focus", listener);
    window.removeEventListener("pageshow", listener);
    document.removeEventListener("visibilitychange", listener);
  };
};
const readSystemDark = () => systemColorScheme().matches;

// The host preference is shared with every embedded theme. Lumina retains its
// original data-appearance contract and never imports the host palette.
export function usePreferences() {
  const appearance = useColorModePreference();
  const systemDark = useSyncExternalStore(subscribeSystem, readSystemDark, () => false);
  const resolvedAppearance = appearance === "system" ? (systemDark ? "dark" : "light") : appearance;
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.appearance = resolvedAppearance;
    root.style.colorScheme = resolvedAppearance;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = resolvedAppearance === "dark" ? "#000000" : "#F5F5F7";
  }, [resolvedAppearance]);
  return { appearance, resolvedAppearance, setAppearance: saveColorModePreference };
}
