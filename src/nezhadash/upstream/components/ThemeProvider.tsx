// MMWX adaptation (2026-09-29): host data/theme/router integration; see licenses/NezhaDash-NOTICE.md.
import { createContext, type ReactNode, useEffect } from 'react';
import { useColorModePreference, saveColorModePreference } from '../../../theme-settings';
import { watchAppearance } from '../../../use-probe';
export type Theme = 'dark' | 'light' | 'system';
const ThemeProviderContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({theme:'system',setTheme:()=>{}});
export function ThemeProvider({children}: {children:ReactNode;storageKey?:string}) {
  const theme = useColorModePreference();
  useEffect(() => watchAppearance(), []);
  return <ThemeProviderContext.Provider value={{theme,setTheme:saveColorModePreference}}>{children}</ThemeProviderContext.Provider>;
}
export { ThemeProviderContext };
