'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { locales, Locale, languageNames, languageNamesNative, getDirection } from '@/i18n/config';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'modal';
  className?: string;
}

const LANGUAGE_STORAGE_KEY = 'echolock_language';

export default function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useState<Locale>('en');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Load saved language preference
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Locale;
    if (saved && locales.includes(saved)) {
      setCurrentLocale(saved);
      applyLanguage(saved);
    } else {
      // Detect browser language
      const browserLang = navigator.language.split('-')[0] as Locale;
      if (locales.includes(browserLang)) {
        setCurrentLocale(browserLang);
        applyLanguage(browserLang);
      }
    }
  }, []);

  const applyLanguage = (locale: Locale) => {
    // Update HTML lang attribute
    document.documentElement.lang = locale;

    // Update text direction for RTL languages
    const direction = getDirection(locale);
    document.documentElement.dir = direction;

    // Update data attribute for CSS styling
    document.documentElement.setAttribute('data-locale', locale);

    // Save preference
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);

    // Trigger custom event for language change
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { locale } }));
  };

  const handleLanguageChange = (locale: Locale) => {
    setCurrentLocale(locale);
    applyLanguage(locale);
    setShowDropdown(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 border-2 border-black hover:bg-cream-dark transition-colors rounded"
        aria-label="Select language"
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        <Globe className="w-5 h-5" aria-hidden="true" />
        <span className="font-mono text-sm font-bold">{languageNamesNative[currentLocale]}</span>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
            aria-hidden="true"
          />

          {/* Dropdown Menu */}
          <div
            className="absolute right-0 mt-2 w-56 bg-cream border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] z-50 animate-fade-in-up"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="language-menu"
          >
            <div className="p-2 border-b-2 border-black bg-blue text-cream">
              <p className="font-bold text-sm uppercase font-heading">Select Language</p>
            </div>

            <div className="p-2">
              {locales.map((locale) => (
                <button
                  key={locale}
                  onClick={() => handleLanguageChange(locale)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between group ${
                    currentLocale === locale
                      ? 'bg-blue text-cream'
                      : 'hover:bg-cream-dark'
                  }`}
                  role="menuitem"
                  aria-label={`Change language to ${languageNames[locale]}`}
                >
                  <div>
                    <span className="font-mono text-sm font-bold block">
                      {languageNamesNative[locale]}
                    </span>
                    <span
                      className={`text-xs ${
                        currentLocale === locale ? 'text-cream/70' : 'text-gray-600'
                      }`}
                    >
                      {languageNames[locale]}
                    </span>
                  </div>
                  {currentLocale === locale && (
                    <Check className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-2 border-t-2 border-gray-300 bg-cream-dark">
              <p className="text-xs text-gray-600 font-mono text-center">
                More languages coming soon
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Hook to get current language and change handler
 */
export function useLanguage() {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Locale;
    if (saved && locales.includes(saved)) {
      setLocale(saved);
    }

    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLocale(customEvent.detail.locale);
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, []);

  const changeLanguage = (newLocale: Locale) => {
    document.documentElement.lang = newLocale;
    document.documentElement.dir = getDirection(newLocale);
    document.documentElement.setAttribute('data-locale', newLocale);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
    setLocale(newLocale);
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { locale: newLocale } }));
  };

  return {
    locale,
    changeLanguage,
    direction: getDirection(locale),
    isRTL: getDirection(locale) === 'rtl',
  };
}

/**
 * Compact icon-only variant
 */
export function LanguageSwitcherCompact({ className = '' }: { className?: string }) {
  const { locale } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);

  const handleLanguageSelect = (newLocale: Locale) => {
    const event = new CustomEvent('languagechange', { detail: { locale: newLocale } });
    window.dispatchEvent(event);
    setShowMenu(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-cream-dark rounded transition-colors border-2 border-black"
        aria-label={`Current language: ${languageNamesNative[locale]}`}
        aria-expanded={showMenu}
      >
        <Globe className="w-5 h-5" aria-hidden="true" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-2 w-48 bg-cream border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] z-50 p-2">
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => handleLanguageSelect(l)}
                className={`w-full px-3 py-2 text-left rounded font-mono text-sm ${
                  l === locale ? 'bg-blue text-cream font-bold' : 'hover:bg-cream-dark'
                }`}
              >
                {languageNamesNative[l]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
