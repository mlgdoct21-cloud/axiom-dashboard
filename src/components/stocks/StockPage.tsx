'use client';

import { useState } from 'react';
import StockSearch from './StockSearch';
import StockHeader from './StockHeader';
import FundamentalsTab from './FundamentalsTab';
import TechnicalsTab from './TechnicalsTab';
import AnalystTab from './AnalystTab';
import AxiomV3Container from './AxiomV3Container';

interface StockPageProps {
  initialSymbol?: string;
  locale: 'en' | 'tr';
}

type TabType = 'fundamentals' | 'technicals' | 'analyst' | 'axiom_v3';

const TABS: {
  id: TabType;
  labelEn: string;
  labelTr: string;
  icon: string;
}[] = [
  { id: 'fundamentals', labelEn: 'Fundamentals', labelTr: 'Temel Analiz', icon: '📊' },
  { id: 'technicals', labelEn: 'Technicals', labelTr: 'Teknikler', icon: '📈' },
  { id: 'analyst', labelEn: 'Analyst', labelTr: 'Analist', icon: '🤖' },
  { id: 'axiom_v3', labelEn: 'AXIOM v3.0', labelTr: 'AXIOM v3.0', icon: '🚀' },
];

export default function StockPage({ initialSymbol, locale }: StockPageProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(initialSymbol || null);
  const [activeTab, setActiveTab] = useState<TabType>('fundamentals');
  const [stockName, setStockName] = useState('');
  const [stockSector, setStockSector] = useState('');

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('fundamentals');
  };

  const renderTabContent = () => {
    if (!selectedSymbol) return null;

    switch (activeTab) {
      case 'fundamentals':
        return <FundamentalsTab symbol={selectedSymbol} locale={locale} />;
      case 'technicals':
        return <TechnicalsTab symbol={selectedSymbol} locale={locale} />;
      case 'analyst':
        return (
          <AnalystTab
            symbol={selectedSymbol}
            name={stockName}
            sector={stockSector}
            locale={locale}
          />
        );
      case 'axiom_v3':
        return <AxiomV3Container symbol={selectedSymbol} locale={locale} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <StockSearch locale={locale} onSelect={handleSymbolSelect} />
        </div>
      </div>

      {/* Content Area */}
      {selectedSymbol ? (
        <div className="space-y-6">
          {/* Stock Header */}
          <StockHeader symbol={selectedSymbol} locale={locale} />

          {/* Tab Navigation */}
          <div className="flex gap-1 border-b border-[#2a2a3e] overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-[#4fc3f7] text-[#4fc3f7]'
                    : 'border-transparent text-[#8888a0] hover:text-[#c0c0d0]'
                }`}
              >
                {tab.icon} {locale === 'tr' ? tab.labelTr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
            {renderTabContent()}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-[#e0e0e0] mb-2">
            {locale === 'tr' ? 'Hisse Ara' : 'Search for a Stock'}
          </h2>
          <p className="text-[#8888a0]">
            {locale === 'tr'
              ? 'Analiz etmek istediğiniz hisse senedini arayın'
              : 'Find a stock to analyze its fundamentals, technicals, and AI recommendation'}
          </p>
        </div>
      )}
    </div>
  );
}
