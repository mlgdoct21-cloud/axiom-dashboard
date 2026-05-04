'use client';

import OnChainIntelCard from './OnChainIntelCard';
import AlertHistoryCard from './AlertHistoryCard';

/**
 * On-Chain tab — CryptoQuant Pro'dan live data, Axiom Skor + 5 panel
 * + Son 7 Gün Alarmlar. Whitepaper tab'ından bağımsız çalışır, kendi
 * fetch akışı vardır, tek bağımlılık symbol param'ı.
 */
export default function OnChainTab({ symbol }: { symbol: string }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#2a2a3e] rounded-xl p-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">🔗</span>
          <h2 className="text-base font-bold text-[#e0e0f0]">On-Chain Akıllı Para</h2>
          <span className="text-xs text-[#555] font-mono">{symbol}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
            CryptoQuant Pro
          </span>
        </div>
        <p className="text-xs text-[#888] mt-1.5 leading-snug">
          Borsa akışları · Balina aktivitesi · Madenci davranışı · Türev piyasa · Döngü pusulası
        </p>
      </div>

      <OnChainIntelCard symbol={symbol} />

      {symbol === 'BTC' && <AlertHistoryCard />}
    </div>
  );
}
