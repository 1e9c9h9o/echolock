/**
 * i18n Utilities
 * Simple translation system without framework dependency
 */

import { Locale, defaultLocale } from '@/i18n/config';

// Import translation files
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import fr from '@/i18n/locales/fr.json';
import ar from '@/i18n/locales/ar.json';

const translations: Record<Locale, typeof en> = {
  en,
  es,
  fr,
  ar,
};

/**
 * Get nested translation value by key path
 * @example
 * getTranslation('common.loading', 'en') => 'Loading...'
 * getTranslation('dashboard.welcome', 'en', { name: 'John' }) => 'Welcome back, John'
 */
export function getTranslation(
  key: string,
  locale: Locale = defaultLocale,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.');
  let value: any = translations[locale] || translations[defaultLocale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations[defaultLocale];
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found in any language
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key; // Return key if final value is not a string
  }

  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    });
  }

  return value;
}

/**
 * Short alias for getTranslation
 */
export const t = getTranslation;

/**
 * Get current locale from localStorage or browser
 */
export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const saved = localStorage.getItem('echolock_language') as Locale;
  if (saved && isValidLocale(saved)) {
    return saved;
  }

  const browserLang = navigator.language.split('-')[0] as Locale;
  if (isValidLocale(browserLang)) {
    return browserLang;
  }

  return defaultLocale;
}

/**
 * Check if locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return ['en', 'es', 'fr', 'ar'].includes(locale);
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date, locale: Locale = defaultLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    return date.toLocaleDateString();
  }
}

/**
 * Format time according to locale
 */
export function formatTime(date: Date, locale: Locale = defaultLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    return date.toLocaleTimeString();
  }
}

/**
 * Format number according to locale
 */
export function formatNumber(num: number, locale: Locale = defaultLocale): string {
  try {
    return new Intl.NumberFormat(locale).format(num);
  } catch (error) {
    return num.toString();
  }
}

/**
 * Pluralization helper
 */
export function plural(
  count: number,
  singular: string,
  plural: string,
  locale: Locale = defaultLocale
): string {
  // Basic pluralization - can be enhanced for different language rules
  if (locale === 'ar') {
    // Arabic has complex plural rules
    if (count === 0) return plural;
    if (count === 1) return singular;
    if (count === 2) return plural;
    if (count <= 10) return plural;
    return plural;
  }

  // Default pluralization for most languages
  return count === 1 ? singular : plural;
}

/**
 * React hook for translations
 */
export function useTranslations() {
  const locale = getCurrentLocale();

  const translate = (key: string, params?: Record<string, string | number>) => {
    return getTranslation(key, locale, params);
  };

  return {
    t: translate,
    locale,
    formatDate: (date: Date) => formatDate(date, locale),
    formatTime: (date: Date) => formatTime(date, locale),
    formatNumber: (num: number) => formatNumber(num, locale),
  };
}
