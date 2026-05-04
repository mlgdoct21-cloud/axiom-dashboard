'use client';

import { OnChainSnapshot, ScoreZone } from '@/lib/cryptoquant';

const ZONE_META: Record<ScoreZone, { color: string; label: string; emoji: string; bg: string }> = {
  OPPORTUNITY: { color: '#a78bfa', label: 'Fırsat',     emoji: '💎', bg: '#a78bfa' },
  SAFE:        { color: '#26de81', label: 'Güvenli',    emoji: '🟢', bg: '#26de81' },
  CAUTION:     { color: '#fbbf24', label: 'Dikkatli',   emoji: '🟡', bg: '#fbbf24' },
  RISKY:       { color: '#ff9800', label: 'Riskli',     emoji: '🟠', bg: '#ff9800' },
  DANGER:      { color: '#ff4757', label: 'Tehlikeli',  emoji: '🔴', bg: '#ff4757' },
  UNKNOWN:     { color: '#888',    label: 'Veri Yok',   emoji: '❓', bg: '#888' },
};

export default function AxiomScoreWidget({ data, premium = true }: {
  data: OnChainSnapshot;
  premium?: boolean;
}) {
  const score = data.axiom_score ?? 0;
  const zone = ZONE_META[data.score_zone] ?? ZONE_META.UNKNOWN;
  const positives = data.score_breakdown?.filter(b => b.contribution > 0).slice(0, 3) ?? [];
  const negatives = data.score_breakdown?.filter(b => b.contribution < 0).slice(0, 3) ?? [];

  if (data.axiom_score == null) {
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-5 text-center">
        <div className="text-2xl mb-2">❓</div>
        <div className="text-sm text-[#888]">Axiom Skor henüz hesaplanamıyor — on-chain veri bekleniyor.</div>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, score));

  return (
    <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border-2 rounded-xl p-5 overflow-hidden"
      style={{ borderColor: zone.color + '55' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#666] mb-1">
            🎯 Axiom Akıllı Skor · CryptoQuant
          </div>
          <div className="text-[11px] text-[#888]">
            9 sinyalin ağırlıklı toplamı, 0-100 ölçeğinde
          </div>
        </div>
        <div className="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
          style={{ background: zone.color + '22', color: zone.color, border: `1px solid ${zone.color}55` }}>
          {zone.emoji} {zone.label.toUpperCase()}
        </div>
      </div>

      {/* Big number + bar */}
      <div className="flex items-end gap-4 mb-4">
        <div className="leading-none">
          <span className="text-6xl font-black tabular-nums" style={{ color: zone.color }}>
            {score.toFixed(0)}
          </span>
          <span className="text-2xl font-bold text-[#666]">/100</span>
        </div>
        <div className="flex-1 pb-2 min-w-0">
          {/* Gradient bar with zones */}
          <div className="relative h-2.5 rounded-full overflow-hidden bg-[#1a1a2e]">
            {/* Zone backdrop tints */}
            <div className="absolute inset-y-0 left-0 w-[30%] bg-[#ff4757]/20" />
            <div className="absolute inset-y-0 left-[30%] w-[20%] bg-[#ff9800]/20" />
            <div className="absolute inset-y-0 left-[50%] w-[20%] bg-[#fbbf24]/20" />
            <div className="absolute inset-y-0 left-[70%] w-[15%] bg-[#26de81]/20" />
            <div className="absolute inset-y-0 left-[85%] w-[15%] bg-[#a78bfa]/20" />
            {/* Indicator dot */}
            <div className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2 ring-2 ring-[#0d0d1a]"
              style={{ left: `${pct}%`, background: zone.color, boxShadow: `0 0 8px ${zone.color}` }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-[#444] mt-1.5 px-0.5">
            <span>0 🔴</span>
            <span>30 🟠</span>
            <span>50 🟡</span>
            <span>70 🟢</span>
            <span>85 💎</span>
          </div>
        </div>
      </div>

      {/* Summary line */}
      <div className="text-[12px] text-[#c0c0d0] italic mb-4 leading-relaxed">
        {data.score_summary}
      </div>

      {/* Breakdown — premium only */}
      {premium && (positives.length > 0 || negatives.length > 0) ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {positives.length > 0 && (
            <div>
              <div className="text-[10px] font-bold tracking-widest text-[#26de81] uppercase mb-1.5">
                Güç Veren ({positives.reduce((s, p) => s + p.contribution, 0)} puan)
              </div>
              <ul className="space-y-1">
                {positives.map(p => (
                  <li key={p.metric} className="flex items-baseline gap-2 text-[11px]">
                    <span className="text-[#26de81] font-mono font-bold shrink-0">+{p.contribution}</span>
                    <span className="text-[#c0c0d0] truncate">{p.label_tr}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {negatives.length > 0 && (
            <div>
              <div className="text-[10px] font-bold tracking-widest text-[#ff4757] uppercase mb-1.5">
                Baskı Yapan ({negatives.reduce((s, n) => s + n.contribution, 0)} puan)
              </div>
              <ul className="space-y-1">
                {negatives.map(n => (
                  <li key={n.metric} className="flex items-baseline gap-2 text-[11px]">
                    <span className="text-[#ff4757] font-mono font-bold shrink-0">{n.contribution}</span>
                    <span className="text-[#c0c0d0] truncate">{n.label_tr}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : !premium ? (
        <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg px-3 py-2 text-[11px] text-[#a78bfa] text-center">
          🔒 Skor breakdown PREMIUM tier — /upgrade ile detayı görün
        </div>
      ) : null}
    </div>
  );
}
