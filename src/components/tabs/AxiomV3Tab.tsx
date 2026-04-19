'use client';

import { useState } from 'react';
import AxiomV3Container from '../stocks/AxiomV3Container';

/**
 * AXIOM v3.0 Tab
 * Stock selector + v3.0 analysis display
 */

interface Props {
  locale: 'en' | 'tr';
}

const US_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'NFLX', 'AMD'];
const TR_SYMBOLS = ['ASELS', 'GARAN', 'KCHOL', 'THYAO', 'AKBNK', 'BIMAS', 'SASA', 'TOASO'];

export default function AxiomV3Tab({ locale }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [customSymbol, setCustomSymbol] = useState<string>('');
  const [market, setMarket] = useState<'US' | 'TR'>('US');

  const symbols = market === 'US' ? US_SYMBOLS : TR_SYMBOLS;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSymbol.trim()) {
      setSelectedSymbol(customSymbol.trim().toUpperCase());
      setCustomSymbol('');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          🚀 AXIOM v3.0 - Profesyonel Analiz Sistemi
        </h1>
        <p className="text-gray-400">
          5 Ajan Çoklu-Faktör Analiz | Temel + Makro + Teknik + Risk | Kurumsal Yatırım Standardı
        </p>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span>✅ Dynamic Weighting</span>
          <span>✅ Regime Switching (ADX/CHOP)</span>
          <span>✅ Kelly Position Sizing</span>
          <span>✅ Stress Test</span>
          <span>✅ Anti-Bias Analysis</span>
        </div>
      </div>

      {/* Market Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMarket('US')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
            market === 'US'
              ? 'bg-blue-500 text-white'
              : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
          }`}
        >
          🇺🇸 US Hisseleri
        </button>
        <button
          onClick={() => setMarket('TR')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
            market === 'TR'
              ? 'bg-red-500 text-white'
              : 'bg-[#1a1a2e] text-gray-400 border border-[#2a2a3e]'
          }`}
        >
          🇹🇷 TR Hisseleri (BIST)
        </button>
      </div>

      {/* Custom Symbol Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={customSymbol}
          onChange={(e) => setCustomSymbol(e.target.value)}
          placeholder="Özel sembol gir (örn: TSLA, ASELS.IS)"
          className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
        >
          Analiz Et
        </button>
      </form>

      {/* Quick Symbol Buttons */}
      <div className="flex flex-wrap gap-2">
        {symbols.map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              selectedSymbol === sym
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                : 'bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400 hover:text-white hover:border-blue-500'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Analysis Display */}
      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg overflow-hidden">
        <AxiomV3Container symbol={selectedSymbol} locale={locale} />
      </div>
    </div>
  );
}
