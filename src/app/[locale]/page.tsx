'use client';

import { useState } from 'react';
import { redirect, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api';
import NewsTab from '@/components/tabs/NewsTab';
import FundamentalTab from '@/components/tabs/FundamentalTab';
import TechnicalTab from '@/components/tabs/TechnicalTab';
import PricingTab from '@/components/tabs/PricingTab';
import CryptoIntelligencePage from '@/components/crypto/CryptoIntelligencePage';
import LanguageSelector from '@/components/LanguageSelector';

type TabType = 'news' | 'crypto' | 'fundamental' | 'technical' | 'pricing';

export default function Home() {
  const t = useTranslations();
  const locale = useLocale() as 'en' | 'tr';
  const [activeTab, setActiveTab] = useState<TabType>('news');
  const searchParams = useSearchParams();
  // Telegram story-push deep-link uses ?event=<event_id> to auto-open the
  // macro modal on DashboardSummary. Skip the /dashboard redirect when this
  // param is present so authenticated users land on the page that actually
  // hosts the MiniMacroChip + SummaryDetailModal.
  const hasDeepLinkedEvent = !!searchParams.get('event');

  useEffect(() => {
    if (apiClient.isAuthenticated() && !hasDeepLinkedEvent) {
      redirect('/dashboard');
    }
  }, [hasDeepLinkedEvent]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'news', label: t('tabs.news') },
    { id: 'crypto', label: '🔬 Crypto Intel' },
    { id: 'fundamental', label: t('tabs.fundamental') },
    { id: 'technical', label: t('tabs.technical') },
    { id: 'pricing', label: t('tabs.pricing') },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0d0d1a]">
      {/* Row 1: Logo + Language */}
      <nav className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a3e] bg-[#141425]">
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
        <LanguageSelector />
      </nav>

      {/* Row 2: Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-[#2a2a3e] bg-[#141425] overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-1.5 rounded text-sm font-medium transition-all duration-300 relative hover:-translate-y-[2px] hover:scale-105 hover:z-20 hover:shadow-[0_4px_12px_rgba(79,195,247,0.15)] ${
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
      </main>
    </div>
  );
}
