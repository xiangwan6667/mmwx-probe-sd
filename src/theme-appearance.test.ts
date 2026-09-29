import { applyAppearance, saveColorModePreference } from "./use-probe";
import { saveThemePreference } from "./theme-settings";

function check(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

const values = new Map<string, string>();
const classes = new Set<string>();
const classList = {
  [Symbol.iterator]: () => classes[Symbol.iterator](),
  add: (...names: string[]) => names.forEach((name) => classes.add(name)),
  remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
};
let systemDark = false;

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  },
});
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    documentElement: {
      classList,
      dataset: {},
      style: {},
    },
  },
});
Object.defineProperty(globalThis, "matchMedia", {
  configurable: true,
  value: () => ({ matches: systemDark }),
});

saveColorModePreference("dark");
applyAppearance({ theme: "pixel", color_mode: "light" });
check(classes.has("theme-pixel"), "server theme class was not applied");
check(
  classes.has("dark"),
  "local dark preference did not override server default",
);

saveColorModePreference("system");
systemDark = false;
applyAppearance({ theme: "premium", color_mode: "dark" });
check(
  classes.has("theme-premium"),
  "updated server theme class was not applied",
);
check(classes.has("light"), "system light preference was not resolved");
check(!classes.has("theme-pixel"), "stale server theme class was retained");

systemDark = true;
applyAppearance({ theme: "premium", color_mode: "light" });
check(classes.has("dark"), "system dark preference was not resolved");

values.set("mmwx-probe-theme", "anime");
applyAppearance({ theme: "premium", color_mode: "light" });
check(classes.has("theme-anime"), "local theme must override the server theme");
check(!classes.has("theme-premium"), "previous theme must be removed");
applyAppearance({ theme: "flat", color_mode: "dark" });
check(classes.has("theme-anime"), "live updates must preserve the local theme");
applyAppearance();
check(classes.has("theme-anime"), "startup must restore the local theme");
values.set("mmwx-probe-theme", "server");
applyAppearance();
check(
  classes.has("theme-flat"),
  "following server must restore its latest theme",
);
values.set("mmwx-probe-theme", "invalid-theme");
applyAppearance({ theme: "pixel" });
check(
  classes.has("theme-pixel"),
  "invalid preferences must fall back to server",
);

saveThemePreference("premium");
applyAppearance({ theme: "anime" });
check(
  classes.has("theme-premium"),
  "saving a theme must change the rendered appearance",
);
check(
  values.get("mmwx-probe-theme") === "premium",
  "theme must persist across visits",
);

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  get() {
    throw new Error("Storage blocked");
  },
});
saveThemePreference("flat");
saveColorModePreference("dark");
applyAppearance({ theme: "pixel", color_mode: "light" });
check(
  classes.has("theme-flat"),
  "blocked storage must not prevent theme switching",
);
check(classes.has("dark"), "blocked storage must not prevent color switching");
applyAppearance({ theme: "premium", color_mode: "light" });
check(
  classes.has("theme-flat"),
  "blocked storage must retain theme through live updates",
);
saveThemePreference("server");
applyAppearance({ theme: "anime" });
check(classes.has("theme-anime"), "reset must work when storage is blocked");
