import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'light' | 'midnight' | 'sepia' | 'neon' | 'cyberpunk' | 'google';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', setTheme: () => {} });

const THEME_STORAGE_KEY = 'aistudio_ui_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType;
      if (savedTheme) {
        return savedTheme;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'midnight';
      }
    }
    return 'light';
  });

  useEffect(() => {
    // Apply theme data attribute to body
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Framer motion wrap can be added in App
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
