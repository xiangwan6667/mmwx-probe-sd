import { useEffect, useState } from "react";
import { backgroundURL } from './background-url';

export interface SiteSettings {
  master_login_enabled: boolean;
  nezha_background_url: string;
  nezha_mobile_background_url: string;
}

const disabled: SiteSettings = { master_login_enabled: false, nezha_background_url: '', nezha_mobile_background_url: '' };
let settingsPromise: Promise<SiteSettings> | undefined;

// Share one request across themes and component remounts. Errors fail closed.
export function loadSiteSettings(): Promise<SiteSettings> {
  return settingsPromise ??= fetch("/api/site-config", { cache: "no-store", signal: AbortSignal.timeout(5000) })
    .then(async (response) => {
      if (!response.ok) return disabled;
      const settings: unknown = await response.json();
      if (typeof settings !== 'object' || settings === null) return disabled;
      return {
        master_login_enabled:
          typeof settings === "object" && settings !== null &&
          "master_login_enabled" in settings && settings.master_login_enabled === true,
        nezha_background_url: backgroundURL('nezha_background_url' in settings ? settings.nezha_background_url : undefined),
        nezha_mobile_background_url: backgroundURL('nezha_mobile_background_url' in settings ? settings.nezha_mobile_background_url : undefined),
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
