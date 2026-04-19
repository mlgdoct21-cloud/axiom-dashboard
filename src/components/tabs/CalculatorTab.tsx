'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import CalculatorCard from '@/components/calculators/CalculatorCard';
import ProfitLossCalculator from '@/components/calculators/ProfitLossCalculator';
import RiskCalculator from '@/components/calculators/RiskCalculator';
import PositionSizingCalculator from '@/components/calculators/PositionSizingCalculator';

type CalcTab = 'pnl' | 'risk' | 'position';

interface CalculatorTabProps {
  locale: 'en' | 'tr';
}

export default function CalculatorTab({ locale }: CalculatorTabProps) {
  const t = useTranslations('calculator');
  const [activeCalc, setActiveCalc] = useState<CalcTab>('pnl');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
        <p className="text-slate-400">{t('description')}</p>
      </div>

      {/* Calculator Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => setActiveCalc('pnl')}
          className={`px-6 py-3 rounded-lg font-medium transition-smooth ${
            activeCalc === 'pnl'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600'
          }`}
        >
          📊 {locale === 'tr' ? 'Kar/Zarar' : 'Profit/Loss'}
        </button>
        <button
          onClick={() => setActiveCalc('risk')}
          className={`px-6 py-3 rounded-lg font-medium transition-smooth ${
            activeCalc === 'risk'
              ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600'
          }`}
        >
          ⚖️ {locale === 'tr' ? 'Risk Yönetimi' : 'Risk Management'}
        </button>
        <button
          onClick={() => setActiveCalc('position')}
          className={`px-6 py-3 rounded-lg font-medium transition-smooth ${
            activeCalc === 'position'
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600'
          }`}
        >
          📈 {locale === 'tr' ? 'Pozisyon Boyutu' : 'Position Sizing'}
        </button>
      </div>

      {/* Calculator Content */}
      <div className="max-w-3xl mx-auto">
        {activeCalc === 'pnl' && (
          <CalculatorCard
            title={t('pnl.title')}
            description={t('pnl.description')}
            icon="📊"
            locale={locale}
          >
            <ProfitLossCalculator locale={locale} />
          </CalculatorCard>
        )}

        {activeCalc === 'risk' && (
          <CalculatorCard
            title={t('risk.title')}
            description={t('risk.description')}
            icon="⚖️"
            locale={locale}
          >
            <RiskCalculator locale={locale} />
          </CalculatorCard>
        )}

        {activeCalc === 'position' && (
          <CalculatorCard
            title={t('position.title')}
            description={t('position.description')}
            icon="📈"
            locale={locale}
          >
            <PositionSizingCalculator locale={locale} />
          </CalculatorCard>
        )}
      </div>

      {/* Info */}
      <div className="max-w-3xl mx-auto p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
        <p className="text-sm text-slate-300 leading-relaxed">
          {locale === 'tr'
            ? '💡 İpucu: Bu hesapmakineler eğitim amaçlıdır. Gerçek ticaret yapmadan önce hesaplamalarınızı her zaman doğrulayın ve yeterli risk yönetimi uygulayın. Profesyonel danışmanlık almayı unutmayın.'
            : '💡 Tip: These calculators are for educational purposes. Always verify your calculations and implement proper risk management before trading. Consider seeking professional advice.'}
        </p>
      </div>
    </div>
  );
}
