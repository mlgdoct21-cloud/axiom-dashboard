'use client';

import CryptoDashboard from './CryptoDashboard';
import UpgradeOverlay from './UpgradeOverlay';
import { useFeatureQuota } from '@/hooks/useFeatureQuota';

/**
 * Whitepaper tab wrapper — applies the sliding-24h feature quota
 * (free 2/day, premium/advance unlimited) before rendering the
 * Gemini-driven CryptoDashboard. On 402, swaps content for the
 * UpgradeOverlay.
 */
export default function WhitepaperTab({ symbol }: { symbol: string }) {
  const { status, quota } = useFeatureQuota('crypto_overview');

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

  // allowed (or error → fail-open: show content)
  return (
    <div className="space-y-3">
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
      <CryptoDashboard symbol={symbol} />
    </div>
  );
}
