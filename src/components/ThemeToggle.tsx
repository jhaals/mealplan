import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';

const ORDER = ['system', 'light', 'dark'] as const;

const GLYPH = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19.07 4.93l-1.77 1.77M6.7 17.3l-1.77 1.77M19.07 19.07l-1.77-1.77M6.7 6.7 4.93 4.93" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </svg>
  ),
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const nextTheme = () => {
    const currentIndex = ORDER.indexOf(theme);
    setTheme(ORDER[(currentIndex + 1) % ORDER.length]);
  };

  const label = t(`theme.${theme}`);

  return (
    <button
      onClick={nextTheme}
      className="grid place-items-center rounded-full text-muted transition-colors hover:text-ink"
      style={{ width: 44, height: 44 }}
      title={label}
      aria-label={t('theme.toggleLabel', { theme: label })}
    >
      {GLYPH[theme]}
    </button>
  );
}
