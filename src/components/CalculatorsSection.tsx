'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import CalculatorCard from '@/components/calculators/CalculatorCard';
import ProfitLossCalculator from '@/components/calculators/ProfitLossCalculator';
import RiskCalculator from '@/components/calculators/RiskCalculator';
import PositionSizingCalculator from '@/components/calculators/PositionSizingCalculator';
import { useLocale } from 'next-intl';

type CalcTab = 'pnl' | 'risk' | 'position';

export default function CalculatorsSection() {
  const [activeTab, setActiveTab] = useState<CalcTab>('pnl');
  const t = useTranslations('calculators');
  const locale = useLocale() as 'en' | 'tr';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          {locale === 'tr' ? 'Ticaret Hesaplayıcıları' : 'Trading Calculators'}
        </h2>
        <p className="text-lg text-slate-400">
          {locale === 'tr'
            ? 'Stratejinizi analiz edin, riskinizi yönetin ve pozisyonlarınızı optimize edin'
            : 'Analyze your strategy, manage risk, and optimize your positions'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`px-6 py-3 rounded-lg font-medium transition-smooth ${
            activeTab === 'pnl'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600'
          }`}
        >
          📊 {locale === 'tr' ? 'Kar/Zarar' : 'Profit/Loss'}
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-6 py-3 rounded-lg font-medium transition-smooth ${
            activeTab === 'risk'
              ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600'
          }`}
        >
          ⚖️ {locale === 'tr' ? 'Risk Yönetimi' : 'Risk Management'}
        </button>
        <button
          onClick={() => setActiveTab('position')}
          className={`px-6 py-3 rounded-lg font-medium transition-smooth ${
            activeTab === 'position'
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600'
          }`}
        >
          📈 {locale === 'tr' ? 'Pozisyon Boyutu' : 'Position Sizing'}
        </button>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto">
        {activeTab === 'pnl' && (
          <CalculatorCard
            title={locale === 'tr' ? 'Kar/Zarar Hesaplayıcısı' : 'Profit/Loss Calculator'}
            description={
              locale === 'tr'
                ? 'Ticaret sonuçlarını analiz edin ve kâr/zarar oranını hesapla'
                : 'Analyze your trade outcomes and calculate profit/loss ratios'
            }
            icon="📊"
            locale={locale}
          >
            <ProfitLossCalculator locale={locale} />
          </CalculatorCard>
        )}

        {activeTab === 'risk' && (
          <CalculatorCard
            title={locale === 'tr' ? 'Risk Yönetimi Hesaplayıcısı' : 'Risk Management Calculator'}
            description={
              locale === 'tr'
                ? 'Pozisyon boyutunu hesapla, riski kontrol et ve beklenen değeri öğren'
                : 'Calculate position size, control risk, and understand expected value'
            }
            icon="⚖️"
            locale={locale}
          >
            <RiskCalculator locale={locale} />
          </CalculatorCard>
        )}

        {activeTab === 'position' && (
          <CalculatorCard
            title={locale === 'tr' ? 'Pozisyon Boyutu Hesaplayıcısı' : 'Position Sizing Calculator'}
            description={
              locale === 'tr'
                ? 'Kaldıraç ile pozisyon boyutunu optimize et ve marj gereksinimlerini anla'
                : 'Optimize position size with leverage and understand margin requirements'
            }
            icon="📈"
            locale={locale}
          >
            <PositionSizingCalculator locale={locale} />
          </CalculatorCard>
        )}
      </div>

      {/* Info Box */}
      <div className="max-w-3xl mx-auto p-6 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
        <p className="text-sm text-slate-300 leading-relaxed">
          {locale === 'tr'
            ? '💡 İpucu: Bu hesaplayıcılar eğitim amaçlıdır. Gerçek ticaret yapmadan önce hesaplamalarınızı her zaman doğrulayın ve yeterli risk yönetimi uygulayın.'
            : '💡 Tip: These calculators are for educational purposes. Always verify your calculations and implement proper risk management before trading.'}
        </p>
      </div>
    </section>
  );
}
