import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { getSetting, saveSetting } from '../lib/data/settingsRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

export type ThemeType = 'light' | 'midnight' | 'sepia' | 'neon' | 'cyberpunk' | 'google';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', setTheme: () => {} });

const themeOptions: ThemeType[] = ['light', 'midnight', 'sepia', 'neon', 'cyberpunk', 'google'];

function normalizeTheme(value: unknown): ThemeType {
  return themeOptions.includes(value as ThemeType) ? (value as ThemeType) : 'light';
}

function getPreferredTheme(): ThemeType {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'midnight';
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const session = useSaasSession();
  const settingsContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const contextKey = `${settingsContext.workspaceId}:${settingsContext.userId}`;
  const skipNextSaveRef = useRef(false);
  const [theme, setTheme] = useState<ThemeType>(() =>
    normalizeTheme(getSetting('aistudio_ui_theme', getPreferredTheme(), settingsContext)),
  );

  useEffect(() => {
    skipNextSaveRef.current = true;
    setTheme(normalizeTheme(getSetting('aistudio_ui_theme', getPreferredTheme(), settingsContext)));
  }, [contextKey, settingsContext]);

  useEffect(() => {
    // Apply theme data attribute to body
    document.body.setAttribute('data-theme', theme);
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveSetting('aistudio_ui_theme', theme, settingsContext);
  }, [contextKey, settingsContext, theme]);

  // Framer motion wrap can be added in App
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
