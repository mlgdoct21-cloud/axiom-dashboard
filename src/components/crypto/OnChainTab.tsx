'use client';

import OnChainIntelCard from './OnChainIntelCard';
import AlertHistoryCard from './AlertHistoryCard';
import UpgradeOverlay from './UpgradeOverlay';
import { useFeatureQuota } from '@/hooks/useFeatureQuota';

/**
 * On-Chain tab — CryptoQuant Pro live data. Same sliding-24h feature
 * quota gate as Whitepaper (free 2/day, paid unlimited). On 402,
 * UpgradeOverlay replaces the content.
 */
export default function OnChainTab({ symbol }: { symbol: string }) {
  const { status, quota } = useFeatureQuota('crypto_onchain');

  if (status === 'pending') {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'paywall' && quota) {
    return <UpgradeOverlay quota={quota} />;
  }

  return (
    <div className="space-y-3">
      {/* Quota badge for free users */}
      {quota && quota.tier === 'free' && quota.limit !== null && quota.remaining !== null && (
        <div className="bg-[#0d0d1a] border border-[#fbbf24]/30 rounded-lg px-3 py-2 text-[11px] text-[#fbbf24] flex items-center gap-2">
          <span className="text-base">⏳</span>
          <span>
            <b>{quota.used}/{quota.limit}</b> ücretsiz hak kullanıldı bugün ·
            {quota.remaining > 0
              ? <span className="text-[#888] ml-1">{quota.remaining} hak kaldı</span>
              : <span className="text-[#ff9800] ml-1">son hak — sonraki ziyarette PREMIUM gerek</span>
            }
          </span>
        </div>
      )}

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
