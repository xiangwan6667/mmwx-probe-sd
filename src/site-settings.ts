import { useEffect, useState } from "react";

export interface SiteSettings {
  master_login_enabled: boolean;
}

const disabled: SiteSettings = { master_login_enabled: false };
let settingsPromise: Promise<SiteSettings> | undefined;

// Share one request across themes and component remounts. Errors fail closed.
export function loadSiteSettings(): Promise<SiteSettings> {
  return settingsPromise ??= fetch("/api/site-config", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return disabled;
      const settings: unknown = await response.json();
      return {
        master_login_enabled:
          typeof settings === "object" && settings !== null &&
          "master_login_enabled" in settings && settings.master_login_enabled === true,
      };
    })
    .catch(() => disabled);
}

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(disabled);
  useEffect(() => {
    let active = true;
    void loadSiteSettings().then((value) => {
      if (active) setSettings(value);
    });
    return () => { active = false; };
  }, []);
  return settings;
}
