'use client';

import { useState } from 'react';
import DevHealthCard from './DevHealthCard';
import TokenomicsCard from './TokenomicsCard';
import CryptoAnalysisCard from './CryptoAnalysisCard';
import WhitepaperCard from './WhitepaperCard';

const SYMBOLS = ['SOL', 'ETH', 'BTC', 'ARB', 'AVAX', 'ADA', 'DOT', 'LINK'];

export default function CryptoIntelligencePage() {
  const [symbol, setSymbol] = useState('SOL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e0e0e0]">🔬 Crypto Intelligence</h1>
        <p className="text-sm text-[#555570] mt-1">
          On-chain data + GitHub activity + AI analysis — all in one place
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

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DevHealthCard symbol={symbol} />
        <TokenomicsCard symbol={symbol} />
        <CryptoAnalysisCard symbol={symbol} />
        <WhitepaperCard symbol={symbol} />
      </div>
    </div>
  );
}
