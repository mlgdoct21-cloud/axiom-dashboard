'use client';

import { useState } from 'react';
import CryptoDashboard from './CryptoDashboard';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX', 'ADA', 'DOT', 'LINK', 'UNI', 'NEAR'];

export default function CryptoIntelligencePage() {
  const [symbol, setSymbol] = useState('BTC');

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e0e0e0]">Kripto Analiz</h1>
        <p className="text-sm text-[#555570] mt-1">
          Tokenomics · Whitepaper Özeti · Akıllı Para · Kilit Açılımları
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
                : 'bg-[#0d0d1a] border border-[#2a2a3e] text-[#8888a0] hover:border-[#4fc3f7] hover:text-[#4fc3f7]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      <CryptoDashboard symbol={symbol} />
    </div>
  );
}
