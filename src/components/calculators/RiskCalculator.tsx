'use client';

import { useState, useEffect } from 'react';
import { calculateRisk, formatCurrency, calculateBreakEvenWinRate, type RiskResult } from '@/lib/calculator-utils';

interface RiskCalculatorProps {
  locale?: 'en' | 'tr';
}

export default function RiskCalculator({ locale = 'en' }: RiskCalculatorProps) {
  const [portfolioBalance, setPortfolioBalance] = useState<string>('10000');
  const [riskPercent, setRiskPercent] = useState<string>('2');
  const [entryPrice, setEntryPrice] = useState<string>('100');
  const [stopLoss, setStopLoss] = useState<string>('95');
  const [profitTarget, setProfitTarget] = useState<string>('110');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'TRY'>('USD');
  const [result, setResult] = useState<RiskResult>({
    positionSize: 0,
    maxLoss: 0,
    riskReward: 0,
    expectedValue: 0,
    portfolioRiskPercent: 0,
  });

  useEffect(() => {
    const balance = parseFloat(portfolioBalance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLoss) || 0;
    const target = parseFloat(profitTarget) || 0;

    const newResult = calculateRisk(balance, risk, entry, stop, target);
    setResult(newResult);

    // Save to localStorage
    localStorage.setItem('risk-calculator', JSON.stringify({
      portfolioBalance,
      riskPercent,
      entryPrice,
      stopLoss,
      profitTarget,
      currency,
      result: newResult,
      timestamp: new Date().toISOString(),
    }));
  }, [portfolioBalance, riskPercent, entryPrice, stopLoss, profitTarget, currency]);

  const handleReset = () => {
    setPortfolioBalance('10000');
    setRiskPercent('2');
    setEntryPrice('100');
    setStopLoss('95');
    setProfitTarget('110');
    setCurrency('USD');
  };

  const breakEvenRate = calculateBreakEvenWinRate(result.riskReward);
  const currencySymbol = currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : '$';

  // Risk gauge calculation
  const getRiskColor = (percent: number) => {
    if (percent <= 1) return 'bg-emerald-500';
    if (percent <= 2) return 'bg-cyan-500';
    if (percent <= 3) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Portföy Bakiyesi' : 'Portfolio Balance'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
            <input
              type="number"
              value={portfolioBalance}
              onChange={(e) => setPortfolioBalance(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
              placeholder="0"
              step="100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <div className="flex justify-between">
              <span>{locale === 'tr' ? 'Risk %' : 'Risk %'}</span>
              <span className="text-cyan-400">{riskPercent}%</span>
            </div>
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="text-xs text-slate-500 mt-1">
            {locale === 'tr' ? 'Önerilen: 1-3%' : 'Recommended: 1-3%'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Giriş Fiyatı' : 'Entry Price'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Duruş Kaybı' : 'Stop Loss'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-smooth"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Kâr Hedefi' : 'Profit Target'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
            <input
              type="number"
              value={profitTarget}
              onChange={(e) => setProfitTarget(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-emerald-500 focus:outline-none transition-smooth"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Para Birimi' : 'Currency'}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR' | 'TRY')}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="TRY">TRY (₺)</option>
          </select>
        </div>
      </div>

      {/* Risk Gauge */}
      <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
        <div className="text-sm text-slate-400 mb-2">{locale === 'tr' ? 'Risk Göstergesi' : 'Risk Gauge'}</div>
        <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getRiskColor(parseFloat(riskPercent))} transition-all duration-300`}
            style={{ width: `${Math.min(parseFloat(riskPercent) * 10, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>Düşük</span>
          <span>Orta</span>
          <span>Yüksek</span>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/50">
          <div className="text-xs text-slate-400">
            {locale === 'tr' ? 'Pozisyon Boyutu' : 'Position Size'}
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {result.positionSize}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {locale === 'tr' ? 'Birim' : 'units'}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/50">
          <div className="text-xs text-slate-400">
            {locale === 'tr' ? 'Maksimum Zarar' : 'Max Loss'}
          </div>
          <div className="text-xl font-bold text-orange-400">
            {formatCurrency(result.maxLoss, locale, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {locale === 'tr' ? 'Riskli' : 'at risk'}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/50">
          <div className="text-xs text-slate-400">
            {locale === 'tr' ? 'Risk/Ödül Oranı' : 'Risk/Reward'}
          </div>
          <div className="text-xl font-bold text-purple-400">
            1:{result.riskReward.toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/50">
          <div className="text-xs text-slate-400">
            {locale === 'tr' ? 'Kır-Baş Oranı' : 'Break Even Rate'}
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {breakEvenRate.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-smooth font-medium"
      >
        {locale === 'tr' ? 'Sıfırla' : 'Reset'}
      </button>
    </div>
  );
}
