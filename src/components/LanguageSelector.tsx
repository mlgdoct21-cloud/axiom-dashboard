'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LOCALES } from '@/lib/locales';
import { useState } from 'react';

export default function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLocale: string) => {
    const pathname = window.location.pathname;
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
    setIsOpen(false);
  };

  const currentLocale = LOCALES[locale as keyof typeof LOCALES];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-smooth text-slate-300 hover:text-white"
        aria-label="Select language"
      >
        <span className="text-lg">{currentLocale?.flag}</span>
        <span className="text-sm font-medium">{currentLocale?.code.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 transition transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {Object.entries(LOCALES).map(([localeCode, localeData]) => (
            <button
              key={localeCode}
              onClick={() => handleLanguageChange(localeCode)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-smooth flex items-center gap-3 ${
                locale === localeCode ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/30 text-white border-l-2 border-cyan-500' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-lg">{localeData.flag}</span>
              <div>
                <div className="text-sm font-medium">{localeData.name}</div>
                <div className="text-xs text-slate-500">{localeData.code}</div>
              </div>
              {locale === localeCode && (
                <svg className="w-4 h-4 ml-auto text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
