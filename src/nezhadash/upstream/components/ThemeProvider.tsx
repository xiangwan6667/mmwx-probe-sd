// MMWX adaptation (2026-09-29): host data/theme/router integration; see licenses/NezhaDash-NOTICE.md.
import { createContext, type ReactNode, useEffect } from 'react';
import { useColorModePreference, saveColorModePreference } from '../../../theme-settings';
import { getProbe } from '../../bridge';
export type Theme = 'dark' | 'light' | 'system';
const ThemeProviderContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({theme:'system',setTheme:()=>{}});
export function ThemeProvider({children}: {children:ReactNode;storageKey?:string}) {
  const theme = useColorModePreference(getProbe().appearance?.color_mode);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => { const dark = theme === 'dark' || (theme === 'system' && media.matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.classList.toggle('light', !dark); };
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [theme]);
  return <ThemeProviderContext.Provider value={{theme,setTheme:saveColorModePreference}}>{children}</ThemeProviderContext.Provider>;
}
export { ThemeProviderContext };
