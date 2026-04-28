'use client';

import { useState } from 'react';
import CryptoReportPanel from './CryptoReportPanel';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'ADA', 'DOT', 'LINK'];

export default function CryptoIntelligencePage() {
  const [symbol, setSymbol] = useState('BTC');

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e0e0e0]">🔬 Kripto İstihbarat Raporu</h1>
        <p className="text-sm text-[#555570] mt-1">
          Kurumsal seviye kripto analizi — 6 perdeli Türkçe AI raporu
        </p>
      </div>

      {/* Symbol selector */}
      <div className="flex flex-wrap gap-2">
        {SYMBOLS.map(s => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              symbol === s
                ? 'bg-[#4fc3f7] text-[#0d0d1a]'
                : 'bg-[#1a1a2e] border border-[#2a2a3e] text-[#8888a0] hover:border-[#4fc3f7] hover:text-[#4fc3f7]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Report panel */}
      <CryptoReportPanel symbol={symbol} />
    </div>
  );
}
