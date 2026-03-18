import { useState, useEffect, useCallback } from 'react';

type Theme = 'system' | 'light' | 'dark';

function getStoredTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function updateThemeColor(isDark: boolean) {
  const color = isDark ? '#1a1916' : '#fefcf8';
  const metaTags = document.querySelectorAll('meta[name="theme-color"]');
  metaTags.forEach((tag) => {
    tag.setAttribute('content', color);
  });
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
    updateThemeColor(prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
    updateThemeColor(theme === 'dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  return { theme, setTheme };
}
