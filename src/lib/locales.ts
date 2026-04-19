export type Locale = 'en' | 'tr';

export const LOCALES: Record<Locale, { name: string; flag: string; code: string }> = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    code: 'en',
  },
  tr: {
    name: 'Türkçe',
    flag: '🇹🇷',
    code: 'tr',
  },
};

export const DEFAULT_LOCALE: Locale = 'en';
export const SUPPORTED_LOCALES: Locale[] = Object.keys(LOCALES) as Locale[];
