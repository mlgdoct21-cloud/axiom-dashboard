'use client';

import { QuotaPayload } from '@/hooks/useFeatureQuota';

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'axiom_finansal_bot';

const TAB_LABELS: Record<string, { emoji: string; tr: string }> = {
  crypto_overview: { emoji: '📄', tr: 'Whitepaper' },
  crypto_onchain:  { emoji: '🔗', tr: 'On-Chain' },
};

export default function UpgradeOverlay({ quota }: { quota: QuotaPayload }) {
  const tab = TAB_LABELS[quota.command] ?? { emoji: '🔒', tr: quota.command };
  const upgradeUrl = `https://t.me/${BOT_USERNAME}?start=upgrade_premium`;

  return (
    <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#a78bfa]/30 rounded-xl p-6 sm:p-8 text-center max-w-2xl mx-auto">
      <div className="text-4xl mb-3">🔒</div>
      <h3 className="text-lg font-bold text-[#e0e0f0] mb-1">
        Bugünkü ücretsiz hakkın doldu
      </h3>
      <p className="text-sm text-[#888] mb-6">
        {tab.emoji} {tab.tr}: <span className="text-[#fbbf24] font-mono font-bold">{quota.used}/{quota.limit}</span> kullandın · 24 saat içinde sıfırlanır
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-6 text-left">
        {/* PREMIUM */}
        <div className="bg-[#0d0d1a] border-2 border-[#26de81]/40 rounded-xl p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-base font-bold text-[#26de81]">💎 PREMIUM</span>
            <span className="text-sm font-mono text-[#26de81]">$1.99/ay</span>
          </div>
          <ul className="text-[11px] text-[#c0c0d0] space-y-1 leading-relaxed">
            <li>✓ Tüm analizler sınırsız</li>
            <li>✓ 3 anlık alert/gün</li>
            <li>✓ Sabah brifingi 09:00 TR</li>
            <li>✓ Tüm coinler & makro veriler</li>
          </ul>
        </div>

        {/* ADVANCE */}
        <div className="bg-[#0d0d1a] border-2 border-[#a78bfa]/40 rounded-xl p-4 relative">
          <span className="absolute -top-2 -right-2 text-[9px] px-2 py-0.5 rounded-full bg-[#a78bfa] text-[#0d0d1a] font-bold tracking-wider">
            POWER
          </span>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-base font-bold text-[#a78bfa]">🚀 ADVANCE</span>
            <span className="text-sm font-mono text-[#a78bfa]">$4.99/ay</span>
          </div>
          <ul className="text-[11px] text-[#c0c0d0] space-y-1 leading-relaxed">
            <li>✓ PREMIUM tüm özellikleri +</li>
            <li>✓ <b>Sınırsız</b> anlık alarm</li>
            <li>✓ 30dk refresh (8× hızlı)</li>
            <li>✓ Kendi alarm eşiklerin</li>
            <li>✓ Brifing 1 saat erken</li>
          </ul>
        </div>
      </div>

      <a
        href={upgradeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#a78bfa] to-[#4fc3f7] hover:opacity-90 text-white font-semibold rounded-xl transition shadow-lg shadow-[#a78bfa]/20"
      >
        💎 Yükselt — Telegram'da Devam Et
      </a>
      <p className="text-[10px] text-[#555] mt-3">
        Telegram bot'u açılır, /upgrade akışında plan seçip Stripe ile ödeyebilirsin
      </p>
    </div>
  );
}
