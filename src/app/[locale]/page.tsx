'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import NewsTab from '@/components/tabs/NewsTab';
import FundamentalTab from '@/components/tabs/FundamentalTab';
import TechnicalTab from '@/components/tabs/TechnicalTab';
import PricingTab from '@/components/tabs/PricingTab';
import CryptoIntelligencePage from '@/components/crypto/CryptoIntelligencePage';
import AcademyClient from '@/components/academy/AcademyClient';
import LanguageSelector from '@/components/LanguageSelector';
import AuthControl from '@/components/AuthControl';

type TabType = 'news' | 'crypto' | 'fundamental' | 'technical' | 'academy' | 'pricing';

// Note: this is now the canonical landing for authenticated users. The
// previous version auto-redirected to /dashboard, which dropped paying
// users on the basic news-cards page and hid the rich CryptoPanic-style
// layout (DashboardSummary chips + watchlist + 3-column news). Both routes
// still exist; /dashboard remains as a subpath host for /portfolio etc.
export default function Home() {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'tr';
  const [activeTab, setActiveTab] = useState<TabType>('news');
  const searchParams = useSearchParams();
  // Telegram story-push deep-link uses ?event=<event_id> to auto-open the
  // macro modal on DashboardSummary. The handler lives inside NewsTab.
  const hasDeepLinkedEvent = !!searchParams.get('event');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'news', label: t('tabs.news') },
    { id: 'crypto', label: '🔬 Crypto Intel' },
    { id: 'fundamental', label: t('tabs.fundamental') },
    { id: 'technical', label: t('tabs.technical') },
    { id: 'academy', label: '🎓 Akademi' },
    { id: 'pricing', label: t('tabs.pricing') },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0d0d1a]">
      {/* Row 1: Logo + Language */}
      <nav className="relative overflow-hidden flex items-center justify-between px-4 py-1.5 border-b border-[#2a2a3e] bg-[#141425]">
        {/* Atom logosundan kopup sayfanın en sağına ışık izi bırakarak süzülen elektron */}
        <span className="axiom-electron-fly" aria-hidden="true" />
        <div className="flex items-center gap-3">
          {/* Atom Logo */}
          <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
            <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#e0e0e0" strokeWidth="1.5" transform="rotate(0 50 50)" opacity="0.35" />
            <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#e0e0e0" strokeWidth="1.5" transform="rotate(60 50 50)" opacity="0.35" />
            <ellipse cx="50" cy="50" rx="38" ry="16" stroke="#e0e0e0" strokeWidth="1.5" transform="rotate(120 50 50)" opacity="0.35" />
            <circle cx="50" cy="50" r="7" fill="#e0e0e0" />
            <circle cx="88" cy="50" r="3.5" fill="#4fc3f7" />
            <circle cx="31" cy="17" r="3.5" fill="#4fc3f7" />
            <circle cx="31" cy="83" r="3.5" fill="#4fc3f7" />
          </svg>
          <span className="text-lg font-bold text-[#e0e0e0]">AXIOM</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://x.com/Theaxiom_io"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="AXIOM on X"
            title="AXIOM on X (@Theaxiom_io)"
            className="p-1.5 rounded text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#1e1e38] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://t.me/AxiomAnaliz_Bot"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="AXIOM Telegram Bot"
            title="AXIOM Telegram Bot (@AxiomAnaliz_Bot)"
            className="p-1.5 rounded text-[#8888a0] hover:text-[#4fc3f7] hover:bg-[#1e1e38] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
          <LanguageSelector />
          <AuthControl />
        </div>
      </nav>

      {/* Row 2: Tabs */}
      <div className="flex gap-1 px-4 py-1.5 border-b border-[#2a2a3e] bg-[#141425] overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 rounded text-sm font-medium transition-all duration-300 relative touch-manipulation md:hover:-translate-y-[2px] md:hover:scale-105 md:hover:z-20 md:hover:shadow-[0_4px_12px_rgba(79,195,247,0.15)] ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#1e1e38]'
            }`}
          >
            {activeTab === tab.id && (
              <span className="absolute inset-0 border-b-2 border-[#4fc3f7] shadow-[0_4px_15px_rgba(79,195,247,0.4)] blur-[1px]"></span>
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Row 3: Content - fills ALL remaining space */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'news' && <NewsTab locale={locale} />}
        {activeTab === 'fundamental' && (
          <div className="h-full overflow-auto p-4">
            <FundamentalTab locale={locale} />
          </div>
        )}
        {activeTab === 'technical' && (
          <div className="h-full overflow-auto p-4">
            <TechnicalTab locale={locale} />
          </div>
        )}
        {activeTab === 'pricing' && (
          <div className="h-full overflow-auto p-4">
            <PricingTab locale={locale} />
          </div>
        )}
        {activeTab === 'crypto' && (
          <div className="h-full overflow-auto p-4">
            <CryptoIntelligencePage />
          </div>
        )}
        {activeTab === 'academy' && (
          <div className="h-full overflow-auto">
            <AcademyClient />
          </div>
        )}
      </main>
    </div>
  );
}
