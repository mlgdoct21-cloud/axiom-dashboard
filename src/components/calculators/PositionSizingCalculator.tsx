'use client';

import { useState, useEffect } from 'react';
import { calculatePositionSize, formatCurrency, type PositionResult } from '@/lib/calculator-utils';

interface PositionSizingCalculatorProps {
  locale?: 'en' | 'tr';
}

export default function PositionSizingCalculator({ locale = 'en' }: PositionSizingCalculatorProps) {
  const [accountBalance, setAccountBalance] = useState<string>('10000');
  const [riskPercent, setRiskPercent] = useState<string>('2');
  const [entryPrice, setEntryPrice] = useState<string>('100');
  const [stopLoss, setStopLoss] = useState<string>('95');
  const [leverage, setLeverage] = useState<string>('1');
  const [assetType, setAssetType] = useState<'spot' | 'futures' | 'forex'>('spot');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'TRY'>('USD');
  const [result, setResult] = useState<PositionResult>({
    positionSize: 0,
    contractsCount: 0,
    marginRequired: 0,
    dollarRisk: 0,
    profitTarget: 0,
  });

  useEffect(() => {
    const balance = parseFloat(accountBalance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLoss) || 0;
    const lev = parseFloat(leverage) || 1;

    // Contract size varies by asset type
    let contractSize = 1;
    if (assetType === 'futures') contractSize = 1; // Standard for most futures
    if (assetType === 'forex') contractSize = 100000; // Standard lot size

    const newResult = calculatePositionSize(balance, risk, entry, stop, lev, contractSize);
    setResult(newResult);

    // Save to localStorage
    localStorage.setItem('position-calculator', JSON.stringify({
      accountBalance,
      riskPercent,
      entryPrice,
      stopLoss,
      leverage,
      assetType,
      currency,
      result: newResult,
      timestamp: new Date().toISOString(),
    }));
  }, [accountBalance, riskPercent, entryPrice, stopLoss, leverage, assetType, currency]);

  const handleReset = () => {
    setAccountBalance('10000');
    setRiskPercent('2');
    setEntryPrice('100');
    setStopLoss('95');
    setLeverage('1');
    setAssetType('spot');
    setCurrency('USD');
  };

  const currencySymbol = currency === 'TRY' ? '₺' : currency === 'EUR' ? '€' : '$';
  const leverageWarning = parseFloat(leverage) > 1;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Hesap Bakiyesi' : 'Account Balance'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
              placeholder="0"
              step="100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Risk %' : 'Risk %'}
          </label>
          <input
            type="number"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
            placeholder="0"
            step="0.1"
            max="5"
          />
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
            <div className="flex justify-between">
              <span>{locale === 'tr' ? 'Kaldıraç' : 'Leverage'}</span>
              <span className={leverageWarning ? 'text-orange-400' : 'text-cyan-400'}>{leverage}x</span>
            </div>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          {leverageWarning && (
            <div className="text-xs text-orange-400 mt-1">
              {locale === 'tr' ? '⚠️ Yüksek kaldıraç riski!' : '⚠️ High leverage risk!'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {locale === 'tr' ? 'Varlık Tipi' : 'Asset Type'}
          </label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as 'spot' | 'futures' | 'forex')}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-smooth"
          >
            <option value="spot">{locale === 'tr' ? 'Spot (Hisse)' : 'Spot (Stocks)'}</option>
            <option value="futures">{locale === 'tr' ? 'Vadeli (Futures)' : 'Futures'}</option>
            <option value="forex">{locale === 'tr' ? 'Döviz (Forex)' : 'Forex'}</option>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/50">
          <div className="text-xs text-slate-400">
            {locale === 'tr' ? 'Pozisyon Boyutu' : 'Position Size'}
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {result.positionSize}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {assetType === 'forex' ? 'lots' : locale === 'tr' ? 'birim' : 'units'}
          </div>
        </div>

        {assetType === 'futures' && result.contractsCount > 0 && (
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/50">
            <div className="text-xs text-slate-400">
              {locale === 'tr' ? 'Kontrat Sayısı' : 'Contracts'}
            </div>
            <div className="text-xl font-bold text-purple-400">
              {result.contractsCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {locale === 'tr' ? 'kontrat' : 'contracts'}
            </div>
          </div>
        )}

        <div className={`p-4 rounded-lg ${leverage !== '1' ? 'bg-orange-500/10 border border-orange-500/50' : 'bg-slate-700/50 border border-slate-600'}`}>
          <div className="text-xs text-slate-400">
            {locale === 'tr' ? 'Gerekli Marj' : 'Margin Required'}
          </div>
          <div className={leverage !== '1' ? 'text-xl font-bold text-orange-400' : 'text-xl font-bold text-slate-400'}>
            {formatCurrency(result.marginRequired, locale, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {locale === 'tr' ? 'teminat' : 'collateral'}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/50">
          <div className="text-xs text-slate-400">
            {locale === 'tr' ? 'Dolar Riski' : 'Dollar Risk'}
          </div>
          <div className="text-xl font-bold text-orange-400">
            {formatCurrency(result.dollarRisk, locale, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {locale === 'tr' ? 'riskli' : 'at risk'}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {parseFloat(leverage) > 2 && (
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/50">
          <div className="text-sm text-orange-300">
            {locale === 'tr'
              ? '⚠️ Yüksek kaldıraç kullanıyorsunuz. Marjin call riskini göz önünde bulundurun.'
              : '⚠️ You are using high leverage. Consider margin call risk.'}
          </div>
        </div>
      )}

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
