'use client';

import { useState, useEffect } from 'react';
import { calculatePnL, formatCurrency, type PnLResult } from '@/lib/calculator-utils';

interface ProfitLossCalculatorProps {
  locale?: 'en' | 'tr';
}

export default function ProfitLossCalculator({ locale = 'en' }: ProfitLossCalculatorProps) {
  const [entryPrice, setEntryPrice] = useState<string>('100');
  const [exitPrice, setExitPrice] = useState<string>('110');
  const [quantity, setQuantity] = useState<string>('10');
  const [tradeType, setTradeType] = useState<'long' | 'short'>('long');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'TRY'>('USD');
  const [result, setResult] = useState<PnLResult>({
    pnl: 0,
    pnlPercent: 0,
    roi: 0,
    riskReward: 0,
  });

  useEffect(() => {
    const entry = parseFloat(entryPrice) || 0;
    const exit = parseFloat(exitPrice) || 0;
    const qty = parseFloat(quantity) || 0;

    const newResult = calculatePnL(entry, exit, qty, tradeType);
    setResult(newResult);

    // Save to localStorage
    localStorage.setItem('pnl-calculator', JSON.stringify({
      entryPrice,
      exitPrice,
      quantity,
      tradeType,
      currency,
      result: newResult,
      timestamp: new Date().toISOString(),
    }));
  }, [entryPrice, exitPrice, quantity, tradeType, currency]);

  const handleReset = () => {
    setEntryPrice('100');
    setExitPrice('110');
    setQuantity('10');
    setTradeType('long');
    setCurrency('USD');
  };

  const isProfit = result.pnl >= 0;
  const currencySymbol = currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : '$';

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {locale === 'tr' ? 'Çıkış Fiyatı' : 'Exit Price'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
            <input
              type="number"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Miktar' : 'Quantity'}
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
            placeholder="0"
            step="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Ticaret Türü' : 'Trade Type'}
          </label>
          <select
            value={tradeType}
            onChange={(e) => setTradeType(e.target.value as 'long' | 'short')}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
          >
            <option value="long">{locale === 'tr' ? 'Uzun (Buy)' : 'Long (Buy)'}</option>
            <option value="short">{locale === 'tr' ? 'Kısa (Sell)' : 'Short (Sell)'}</option>
          </select>
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

      {/* Results */}
      <div className="space-y-3">
        <div className={`p-4 rounded-lg border ${isProfit ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-orange-500/10 border-orange-500/50'}`}>
          <div className="text-sm text-slate-400 mb-1">
            {locale === 'tr' ? 'Kar/Zarar' : 'Profit/Loss'}
          </div>
          <div className={`text-2xl font-bold ${isProfit ? 'text-emerald-400' : 'text-orange-400'}`}>
            {isProfit ? '+' : ''}{formatCurrency(result.pnl, locale, currency)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
            <div className="text-xs text-slate-400">
              {locale === 'tr' ? 'P&L %' : 'P&L %'}
            </div>
            <div className={`text-lg font-bold ${result.pnlPercent >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {result.pnlPercent >= 0 ? '+' : ''}{result.pnlPercent.toFixed(2)}%
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
            <div className="text-xs text-slate-400">
              {locale === 'tr' ? 'ROI' : 'ROI'}
            </div>
            <div className={`text-lg font-bold ${result.roi >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(2)}%
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
            <div className="text-xs text-slate-400">
              {locale === 'tr' ? 'Risk/Ödül' : 'Risk/Reward'}
            </div>
            <div className="text-lg font-bold text-cyan-400">
              1:{result.riskReward.toFixed(2)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
            <div className="text-xs text-slate-400">
              {locale === 'tr' ? 'Toplam Tutar' : 'Total Amount'}
            </div>
            <div className="text-lg font-bold text-purple-400">
              {formatCurrency(parseFloat(exitPrice) * parseFloat(quantity) || 0, locale, currency)}
            </div>
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
