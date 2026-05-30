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

// Telegram girişi + in-app navigasyon TR'ye varsayılan. EN açık tutuldu
// (kullanıcı /en/... explicit URL ile gelirse çalışır) ama prefix-yok yollar
// — örn. next-intl Link locale geçirmediğinde — artık TR'ye düşüyor;
// "Detayları gör" gibi tıklamalarda /en'e sıçrama bug'ı giderildi.
export const DEFAULT_LOCALE: Locale = 'tr';
export const SUPPORTED_LOCALES: Locale[] = Object.keys(LOCALES) as Locale[];
