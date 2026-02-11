import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './en/translation.json';
import svTranslation from './sv/translation.json';

// Initialize with English as default, will be updated after API call
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      sv: { translation: svTranslation },
    },
    lng: 'en', // Default to English initially
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    returnNull: false,
    returnEmptyString: false,
  });

/**
 * Fetch language from backend and update i18n
 * Called during app initialization
 */
export async function initializeLanguage(): Promise<void> {
  try {
    const response = await fetch('/api/config/language');
    if (response.ok) {
      const { language } = await response.json();
      if (language && (language === 'en' || language === 'sv')) {
        await i18n.changeLanguage(language);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch language from server, using default:', error);
  }
}

export default i18n;
