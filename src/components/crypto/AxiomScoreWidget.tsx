'use client';

import { useState } from 'react';
import { OnChainSnapshot, ScoreZone } from '@/lib/cryptoquant';
import { useScoreHistory } from '@/hooks/useScoreHistory';

function zoneColorForScore(s: number): string {
  if (s >= 85) return '#a78bfa';
  if (s >= 70) return '#26de81';
  if (s >= 50) return '#fbbf24';
  if (s >= 30) return '#ff9800';
  return '#ff4757';
}

function Sparkline({
  status,
  points,
  currentScore,
  zoneColor,
}: {
  status: 'pending' | 'ok' | 'empty' | 'error';
  points: { date: string; score: number; zone: string }[];
  currentScore: number;
  zoneColor: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (status === 'pending') {
    return <div className="h-12 mb-4 rounded bg-[#1a1a2e]/40 animate-pulse" />;
  }
  if (status === 'empty' || status === 'error' || points.length < 2) {
    return (
      <div className="mb-4 text-[10px] text-[#555] text-center py-2 border border-dashed border-[#1a1a2e] rounded">
        90-günlük geçmiş yetersiz — sparkline birkaç gün içinde aktifleşecek
      </div>
    );
  }

  const W = 320;
  const H = 48;
  const PAD_X = 4;
  const PAD_Y = 4;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const xs = points.map((_, i) => PAD_X + (i / (points.length - 1)) * innerW);
  const ys = points.map(p => PAD_Y + (1 - Math.max(0, Math.min(100, p.score)) / 100) * innerH);

  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  // Area fill underneath the line
  const areaD = `${pathD} L${xs[xs.length - 1].toFixed(1)},${(H - PAD_Y).toFixed(1)} L${xs[0].toFixed(1)},${(H - PAD_Y).toFixed(1)} Z`;

  const lastIdx = points.length - 1;
  const firstScore = points[0].score;
  const delta = currentScore - firstScore;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-[10px] text-[#666] mb-1 px-1">
        <span>Son {points.length} günlük skor</span>
        <span className={delta >= 0 ? 'text-[#26de81]' : 'text-[#ff4757]'}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)} puan
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-12 select-none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          let nearest = 0;
          let bestDx = Infinity;
          xs.forEach((px, i) => {
            const dx = Math.abs(px - x);
            if (dx < bestDx) {
              bestDx = dx;
              nearest = i;
            }
          });
          setHover(nearest);
        }}
      >
        <defs>
          <linearGradient id="sparkArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={zoneColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={zoneColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 50 baseline */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_Y + innerH * 0.5}
          y2={PAD_Y + innerH * 0.5}
          stroke="#2a2a3e"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
        <path d={areaD} fill="url(#sparkArea)" />
        <path d={pathD} fill="none" stroke={zoneColor} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        {/* Last point dot */}
        <circle
          cx={xs[lastIdx]}
          cy={ys[lastIdx]}
          r="2.5"
          fill={zoneColor}
          stroke="#0d0d1a"
          strokeWidth="1"
        />
        {/* Hover marker */}
        {hover != null && (
          <>
            <line
              x1={xs[hover]}
              x2={xs[hover]}
              y1={PAD_Y}
              y2={H - PAD_Y}
              stroke="#4fc3f7"
              strokeWidth="0.6"
              strokeOpacity="0.5"
            />
            <circle
              cx={xs[hover]}
              cy={ys[hover]}
              r="2.5"
              fill={zoneColorForScore(points[hover].score)}
              stroke="#0d0d1a"
              strokeWidth="1"
            />
          </>
        )}
      </svg>
      {hover != null && (
        <div className="text-[10px] text-[#888] text-center mt-0.5">
          {new Date(points[hover].date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })}
          {' · '}
          <span style={{ color: zoneColorForScore(points[hover].score) }} className="font-bold">
            {points[hover].score.toFixed(0)}/100
          </span>
        </div>
      )}
    </div>
  );
}

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
  const [expanded, setExpanded] = useState(false);
  const score = data.axiom_score ?? 0;
  const zone = ZONE_META[data.score_zone] ?? ZONE_META.UNKNOWN;
  const [formulaOpen, setFormulaOpen] = useState(false);
  const history = useScoreHistory(data.symbol, 90);
  const allBreakdown = data.score_breakdown ?? [];
  const positives = allBreakdown.filter(b => b.contribution > 0).sort((a, b) => b.contribution - a.contribution);
  const negatives = allBreakdown.filter(b => b.contribution < 0).sort((a, b) => a.contribution - b.contribution);
  const neutrals  = allBreakdown.filter(b => b.contribution === 0);
  const positiveSum = positives.reduce((s, p) => s + p.contribution, 0);
  const negativeSum = negatives.reduce((s, n) => s + n.contribution, 0);
  const signedTotal = positiveSum + negativeSum;
  const maxTotal = allBreakdown.reduce((s, b) => s + b.weight, 0);
  // Collapsed: top 3 / Expanded: all
  const visiblePositives = expanded ? positives : positives.slice(0, 3);
  const visibleNegatives = expanded ? negatives : negatives.slice(0, 3);
  const hiddenCount = (positives.length - visiblePositives.length) + (negatives.length - visibleNegatives.length) + (expanded ? 0 : neutrals.length);

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
          <div className="text-[10px] uppercase tracking-widest text-[#666] mb-1 flex items-center gap-1">
            🎯 Axiom Akıllı Skor · CryptoQuant
            <button
              type="button"
              onClick={() => setFormulaOpen(o => !o)}
              className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-[#2a2a3e] hover:bg-[#4fc3f7]/30 text-[10px] text-[#888] hover:text-[#4fc3f7] transition cursor-help normal-case tracking-normal"
              aria-label="Skor nasıl hesaplandı?"
              title="Skor nasıl hesaplandı?"
            >
              ⓘ
            </button>
          </div>
          <div className="text-[11px] text-[#888]">
            {allBreakdown.length} sinyalin ağırlıklı toplamı, 0-100 ölçeğinde
          </div>
        </div>
        <div className="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
          style={{ background: zone.color + '22', color: zone.color, border: `1px solid ${zone.color}55` }}>
          {zone.emoji} {zone.label.toUpperCase()}
        </div>
      </div>

      {/* Formula tooltip — açıldığında 53 vs 73 kafa karışıklığını giderir */}
      {formulaOpen && (
        <div className="bg-[#0a0a14] border border-[#4fc3f7]/30 rounded-lg p-3 mb-3 text-[11px] text-[#c0c0d0] leading-relaxed">
          <div className="font-bold text-[#4fc3f7] mb-2 flex items-center justify-between">
            <span>📐 Skor Nasıl Hesaplandı?</span>
            <button
              type="button"
              onClick={() => setFormulaOpen(false)}
              className="text-[#666] hover:text-[#e0e0f0] text-base leading-none"
              aria-label="Kapat"
            >×</button>
          </div>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between">
              <span>Pozitif sinyaller toplamı:</span>
              <span className="text-[#26de81] font-bold">+{positiveSum}</span>
            </div>
            <div className="flex justify-between">
              <span>Negatif sinyaller toplamı:</span>
              <span className="text-[#ff4757] font-bold">{negativeSum}</span>
            </div>
            <div className="flex justify-between border-t border-[#1a1a2e] pt-1.5 mt-1.5">
              <span>Net katkı:</span>
              <span className="font-bold" style={{ color: zone.color }}>
                {signedTotal >= 0 ? '+' : ''}{signedTotal} / {maxTotal} max
              </span>
            </div>
            <div className="flex justify-between">
              <span>Formül:</span>
              <span className="text-[#888]">50 + (net ÷ max) × 50</span>
            </div>
            <div className="flex justify-between border-t border-[#1a1a2e] pt-1.5 mt-1.5">
              <span className="text-[#e0e0f0]">Sonuç:</span>
              <span className="font-bold" style={{ color: zone.color }}>
                50 + ({signedTotal}/{maxTotal}) × 50 = <b>{score.toFixed(0)}/100</b>
              </span>
            </div>
          </div>
          <div className="text-[10px] text-[#666] mt-3 leading-snug">
            Her sinyal kendi ağırlığında: BULLISH ise +max, BEARISH ise −max,
            NEUTRAL ise 0 katkı sağlar. Skor pozitif/negatif dengesini 0-100 ölçeğine taşır.
          </div>
        </div>
      )}

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

      {/* 90-day sparkline — only when we have at least 2 daily snapshots */}
      <Sparkline
        status={history.status}
        points={history.points}
        currentScore={score}
        zoneColor={zone.color}
      />

      {/* Summary line */}
      <div className="text-[12px] text-[#c0c0d0] italic mb-4 leading-relaxed">
        {data.score_summary}
      </div>

      {/* Breakdown — premium only, collapse/expand toggle */}
      {premium && allBreakdown.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {visiblePositives.length > 0 && (
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[#26de81] uppercase mb-1.5">
                  Güç Veren ({positives.reduce((s, p) => s + p.contribution, 0)} puan)
                </div>
                <ul className="space-y-1">
                  {visiblePositives.map(p => (
                    <li key={p.metric} className="flex items-baseline gap-2 text-[11px]">
                      <span className="text-[#26de81] font-mono font-bold shrink-0">+{p.contribution}</span>
                      <span className="text-[#c0c0d0] truncate">{p.label_tr}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {visibleNegatives.length > 0 && (
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[#ff4757] uppercase mb-1.5">
                  Baskı Yapan ({negatives.reduce((s, n) => s + n.contribution, 0)} puan)
                </div>
                <ul className="space-y-1">
                  {visibleNegatives.map(n => (
                    <li key={n.metric} className="flex items-baseline gap-2 text-[11px]">
                      <span className="text-[#ff4757] font-mono font-bold shrink-0">{n.contribution}</span>
                      <span className="text-[#c0c0d0] truncate">{n.label_tr}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Expanded: also show neutrals */}
          {expanded && neutrals.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
              <div className="text-[10px] font-bold tracking-widest text-[#888] uppercase mb-1.5">
                Nötr ({neutrals.length} sinyal)
              </div>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                {neutrals.map(n => (
                  <li key={n.metric} className="flex items-baseline gap-2 text-[11px]">
                    <span className="text-[#666] font-mono font-bold shrink-0">0/{n.weight}</span>
                    <span className="text-[#888] truncate">{n.label_tr}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Toggle button */}
          {(positives.length > 3 || negatives.length > 3 || neutrals.length > 0) && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="mt-3 w-full text-[11px] py-2 rounded-lg bg-[#1a1a2e] hover:bg-[#22223a] text-[#888] hover:text-[#4fc3f7] transition flex items-center justify-center gap-2 border border-[#2a2a3e]"
            >
              {expanded
                ? <>▴ Daralt — sadece top 3 göster</>
                : <>▾ Tüm sinyalleri göster (+{hiddenCount} gizli)</>
              }
            </button>
          )}
        </>
      ) : !premium ? (
        <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg px-3 py-2 text-[11px] text-[#a78bfa] text-center">
          🔒 Skor breakdown PREMIUM tier — /upgrade ile detayı görün
        </div>
      ) : null}
    </div>
  );
}
