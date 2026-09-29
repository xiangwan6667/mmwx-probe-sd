import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Palette, Sun, Moon, SunMoon, X } from "lucide-react";
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
  const dialog = useRef<HTMLDialogElement>(null);
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

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={
          className ? `probe-theme-switch ${className}` : "probe-theme-switch"
        }
        aria-label="切换主题"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="切换主题"
        onClick={() => setOpen(true)}
      >
        <Palette size={18} aria-hidden="true" />
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          className="probe-theme-dialog"
          aria-labelledby={titleId}
          onClose={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="probe-theme-panel">
            <header>
              <div>
                <h2 id={titleId}>外观设置</h2>
                <p>选择喜欢的风格，仅对当前浏览器生效</p>
              </div>
              <button
                type="button"
                className="probe-theme-close"
                aria-label="关闭外观设置"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
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
                      setOpen(false);
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
                      <small>{option.description}</small>
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
            <p className="probe-theme-note">
              设置自动保存；选择「跟随主控」可恢复站点默认风格。
            </p>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}
