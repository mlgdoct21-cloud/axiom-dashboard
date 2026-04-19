import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/lib/locales';

export default getRequestConfig(async ({ requestLocale }) => {
  // Handle async requestLocale
  let locale = await Promise.resolve(requestLocale);

  // Ensure that the incoming `locale` is valid
  if (!locale || !SUPPORTED_LOCALES.includes(locale as Locale)) {
    locale = DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../public/messages/${locale}.json`)).default,
    timeZone: 'UTC',
  };
});
