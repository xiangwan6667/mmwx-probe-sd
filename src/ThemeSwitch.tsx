import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Palette, Sun, Moon, SunMoon } from "lucide-react";
import type { ProbeAppearance } from "./types";
import { themeOptions } from "./theme-preference";
import {
  saveColorModePreference,
  saveThemePreference,
  useColorModePreference,
  useThemePreference,
} from "./theme-settings";
import { applyAppearance } from "./use-probe";
import "./theme-switch.css";

const colorOptions = [
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: SunMoon },
] as const;

export function ThemeSwitch({
  appearance,
  className,
}: {
  appearance?: ProbeAppearance;
  className?: string;
}) {
  const theme = useThemePreference();
  const mode = useColorModePreference(appearance?.color_mode);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const titleId = useId();

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance, theme, mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyAppearance(appearance);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [appearance, mode]);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      if (!trigger.current || !menu.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const panel = menu.current;
      const gap = 8;
      const top = Math.max(
        gap,
        Math.min(anchor.bottom + gap, window.innerHeight - 80),
      );
      panel.style.left = `${Math.max(gap, Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - gap))}px`;
      panel.style.top = `${top}px`;
      panel.style.maxHeight = `${window.innerHeight - top - gap}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={menuId}
        className={
          className ? `probe-theme-switch ${className}` : "probe-theme-switch"
        }
        aria-label="切换主题"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="切换主题"
      >
        <Palette size={18} aria-hidden="true" />
      </button>
      {createPortal(
        <div
          ref={menu}
          id={menuId}
          popover="auto"
          role="dialog"
          className="probe-theme-dropdown"
          aria-labelledby={titleId}
          onToggle={(event) => setOpen(event.newState === "open")}
        >
          <div className="probe-theme-panel">
            <h2 id={titleId}>外观设置</h2>
            <fieldset>
              <legend>主题风格</legend>
              <div className="probe-theme-options">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="probe-theme-option"
                    aria-pressed={theme === option.value}
                    onClick={() => {
                      menu.current?.hidePopover();
                      saveThemePreference(option.value);
                      applyAppearance(appearance);
                    }}
                  >
                    <span
                      className={`probe-theme-swatch swatch-${option.value}`}
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                    </span>
                    {theme === option.value && (
                      <Check size={18} aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>明暗模式</legend>
              <div className="probe-color-options">
                {colorOptions.map(({ value, label, Icon }) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={mode === value}
                    onClick={() => {
                      saveColorModePreference(value);
                      applyAppearance(appearance);
                    }}
                  >
                    <Icon size={17} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
