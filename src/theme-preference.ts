import type { ProbeAppearance } from "./types";

export type ProbeColorMode = NonNullable<ProbeAppearance["color_mode"]>;

export const themeOptions = [
  { value: "server", label: "跟随主控", description: "使用站点默认风格" },
  { value: "pixel", label: "Pixel", description: "像素边框 · 复古简洁" },
  { value: "flat", label: "Flat", description: "扁平设计 · 清爽柔和" },
  { value: "anime", label: "Anime", description: "动漫配色 · 轻盈活泼" },
  { value: "premium", label: "Premium", description: "精致面板 · 全景布局" },
] as const;

export type ProbeThemePreference = (typeof themeOptions)[number]["value"];

export function normalizeThemePreference(value: unknown): ProbeThemePreference {
  return (
    themeOptions.find((option) => option.value === value)?.value ?? "server"
  );
}

export function resolveTheme(
  preference: ProbeThemePreference,
  serverTheme?: string,
): string {
  if (preference !== "server") return preference;
  const theme = typeof serverTheme === "string" ? serverTheme.trim() : "";
  return /^[A-Za-z0-9_-]{1,64}$/.test(theme) ? theme : "pixel";
}

export function normalizeColorMode(
  value: string | null | undefined,
  fallback: ProbeColorMode = "light",
): ProbeColorMode {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : fallback;
}

export function nextColorMode(mode: ProbeColorMode): ProbeColorMode {
  if (mode === "light") return "dark";
  if (mode === "dark") return "system";
  return "light";
}
