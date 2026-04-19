'use client';

import React, { useState } from 'react';
import type { CorporateIntelligence } from '@/app/api/stock/analysis/v3/corporate/route';

/**
 * AxiomFundamentalDashboard
 *
 * Unified, transparent, educational display for the AXIOM v3.0 multi-agent
 * analysis. Every number shows WHERE it came from and HOW it was derived,
 * so the user can see the reasoning chain — not just the final verdict.
 */

export interface AxiomAnalysis {
  symbol: string;
  decision: 'AL' | 'SAT' | 'TUT' | 'İZLE';
  weightedScore: number;

  fundamentalScore: number;
  macroScore: number;
  technicalScore: number;
  dataQualityScore: number;

  fundamentalRationale: string[];
  macroRationale: string[];
  technicalRationale: string[];

  weights: { fundamental: number; macro: number; technical: number; qualitative?: number };

  qualitativeScore?: number;
  qualitativeAdjustment?: number;
  decisionNarrative?: string;

  inputs: {
    pe?: number;
    sectorPE?: number;
    roe?: number;
    sectorROE?: number;
    debtToEquity?: number;
    epsGrowth3y?: number;
    fcf?: number;
    beta: number;
    rs: number;
    fedStance?: string;
    inflationStatus?: string;
    sectorTailwind?: string;
    sentiment?: string;
  };

  dataSources: {
    price: string;
    fundamentals: string;
    technicals: string;
    macro: string;
  };

  regime: string;
  regimeStrength: string;
  timeHorizon: string;
  adx: number;
  chop: number;

  entryZone: { lower: number; upper: number };
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;

  positionSize: {
    finalPosition: number;
    maxDailyLoss: number;
    kellyCriterion?: number;
    volatilityAdjustment?: number;
    varLimit?: number;
  };

  bullCase: string[];
  bearCase: Array<{
    scenario: string;
    trigger: string;
    probability: number;
    impact: string;
  }>;

  stressTest: {
    passCount: number;
    failCount: number;
    recommendation: string;
  };

  support: number[];
  resistance: number[];

  confidenceLevel: number;
  caveat: string;
  timestamp: number;
}

interface Props {
  symbol: string;
  currentPrice: number;
  analysis?: AxiomAnalysis;
  corporate?: CorporateIntelligence;
  isLoading?: boolean;
  error?: string;
}

// ---------- Helpers ----------

const decisionMeta: Record<string, { label: string; badgeBg: string; badgeText: string; icon: string; headline: string }> = {
  AL:   { label: 'AL',       badgeBg: 'bg-emerald-500/15 border-emerald-500/50', badgeText: 'text-emerald-300', icon: '📈', headline: 'Pozisyon açmak için güçlü işaretler' },
  SAT:  { label: 'SAT',      badgeBg: 'bg-red-500/15 border-red-500/50',         badgeText: 'text-red-300',     icon: '📉', headline: 'Çıkış / kısa pozisyon sinyali' },
  TUT:  { label: 'TUT',      badgeBg: 'bg-blue-500/15 border-blue-500/50',       badgeText: 'text-blue-300',    icon: '✋', headline: 'Mevcut pozisyonu koruma — yeni giriş için net sinyal yok' },
  'İZLE': { label: 'İZLE',   badgeBg: 'bg-yellow-500/15 border-yellow-500/50',   badgeText: 'text-yellow-300',  icon: '👁️', headline: 'Kararsız tablo — gelişmeleri bekle' },
};

const timeHorizonLabel: Record<string, string> = {
  SHORT_TERM: 'Kısa Vadeli (günler–haftalar)',
  MEDIUM_TERM: 'Orta Vadeli (haftalar–aylar)',
  LONG_TERM: 'Uzun Vadeli (aylar–yıllar)',
};

const regimeLabel: Record<string, string> = {
  TREND: 'Trendli Piyasa',
  RANGE: 'Yatay / Sıkışık Piyasa',
  TRANSITION: 'Geçiş Dönemi',
};

const scoreColor = (s: number) => {
  if (s >= 65) return { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-500' };
  if (s >= 50) return { text: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    bar: 'bg-blue-500' };
  if (s >= 40) return { text: 'text-yellow-300',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  bar: 'bg-yellow-500' };
  return           { text: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     bar: 'bg-red-500' };
};

const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

// ---------- Sub-components ----------

function AgentCard({
  title,
  weight,
  score,
  purpose,
  rationale,
  sourceNote,
  inputsBlock,
}: {
  title: string;
  weight: number;
  score: number;
  purpose: string;
  rationale: string[];
  sourceNote: string;
  inputsBlock?: React.ReactNode;
}) {
  const c = scoreColor(score);
  const contribution = score * weight;

  return (
    <div className={`${c.bg} ${c.border} border rounded-lg p-4 space-y-3`}>
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-white">{title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{purpose}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-3xl font-bold ${c.text}`}>{score}</div>
          <div className="text-[11px] text-gray-500">/100</div>
        </div>
      </div>

      {/* bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${c.bar}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>

      {/* weight & contribution */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Kararda ağırlığı</span>
        <span className="text-gray-300 font-mono">
          {(weight * 100).toFixed(0)}% → katkı: {contribution.toFixed(1)} puan
        </span>
      </div>

      {/* rationale */}
      <div>
        <div className="text-xs font-semibold text-gray-400 mb-1.5">Neden bu skor?</div>
        {rationale.length === 0 ? (
          <div className="text-xs text-gray-500 italic">Veri yetersiz, nötr skor (50) atandı.</div>
        ) : (
          <ul className="space-y-1">
            {rationale.map((r, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-1.5">
                <span className="text-gray-500 shrink-0">›</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inputsBlock}

      <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-800">
        📡 Kaynak: {sourceNote}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, defaultOpen = true }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#14142a] border border-[#2a2a3e] rounded-lg">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="text-left">
          <div className="text-base font-bold text-white">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
        </div>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

// ---------- Main ----------

export default function AxiomFundamentalDashboard({
  symbol,
  currentPrice,
  analysis,
  corporate,
  isLoading,
  error,
}: Props) {

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 mt-4">5 ajan analiz ediyor: Veri Kalitesi → Temel → Makro → Teknik → Karar</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-300 mb-2">
          <span className="text-xl">⚠️</span>
          <span className="font-bold">Analiz başarısız</span>
        </div>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="py-16 text-center text-gray-400">
        Hisse seçerek analizi başlat.
      </div>
    );
  }

  const dm = decisionMeta[analysis.decision] || decisionMeta.TUT;
  const ws = scoreColor(analysis.weightedScore);

  // Formula string — exactly what the backend did
  const { fundamental: wF, macro: wM, technical: wT } = analysis.weights;
  const formula = `${analysis.weightedScore.toFixed(1)} = ${wF.toFixed(2)}×${analysis.fundamentalScore} + ${wM.toFixed(2)}×${analysis.macroScore} + ${wT.toFixed(2)}×${analysis.technicalScore}`;

  const targetUpPct = ((analysis.targetPrice - currentPrice) / currentPrice) * 100;
  const stopDownPct = ((analysis.stopLoss - currentPrice) / currentPrice) * 100;

  return (
    <div className="space-y-5">
      {/* ================================ HERO ================================ */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#14142a] border border-[#2a2a3e] rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl font-bold text-white">{symbol}</h1>
              <span className="text-2xl font-mono text-gray-200">${currentPrice.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              AXIOM v3.0 · 5-Ajan Çoklu-Faktör Analizi
            </p>
          </div>

          <div className={`${dm.badgeBg} border rounded-xl px-5 py-3 text-right`}>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-2xl">{dm.icon}</span>
              <span className={`text-2xl font-bold ${dm.badgeText}`}>{dm.label}</span>
            </div>
            <div className={`text-xs mt-1 ${dm.badgeText} opacity-80`}>{dm.headline}</div>
          </div>
        </div>

        {/* Weighted score bar */}
        <div className="mt-5">
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Ağırlıklı Skor</span>
            <span className={`text-lg font-bold ${ws.text}`}>
              {analysis.weightedScore.toFixed(1)} / 100
              {analysis.qualitativeAdjustment !== undefined && analysis.qualitativeAdjustment !== 0 && (
                <span className="ml-2 text-xs font-mono text-gray-400">
                  ({analysis.qualitativeAdjustment > 0 ? '+' : ''}{analysis.qualitativeAdjustment.toFixed(1)} kurumsal)
                </span>
              )}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${ws.bar} transition-all`} style={{ width: `${analysis.weightedScore}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>0 — SAT</span>
            <span>40</span>
            <span>55 — TUT</span>
            <span>65 — AL</span>
            <span>100</span>
          </div>
        </div>

        {/* Decision-maker narrative (Agent 6) */}
        {analysis.decisionNarrative && (
          <div className="mt-5 bg-black/30 border-l-4 border-purple-500 rounded-r-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🎯</span>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-purple-300 font-semibold mb-1">
                  Karar Verici Ajan — Özet Yorum
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">{analysis.decisionNarrative}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================= HOW DID WE GET HERE ========================= */}
      <Section title="Bu karara nasıl varıldı?" subtitle="Dinamik ağırlıklandırma + rejim tespiti">
        <div className="space-y-4 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Zaman Ufku</div>
              <div className="text-white font-bold">{timeHorizonLabel[analysis.timeHorizon] || analysis.timeHorizon}</div>
              <div className="text-xs text-gray-500 mt-2">
                {analysis.timeHorizon === 'LONG_TERM' && 'Temel Analiz ağırlığı artırıldı (0.50) — fiyat dalgalanması arka planda.'}
                {analysis.timeHorizon === 'SHORT_TERM' && 'Teknik ağırlığı artırıldı (0.70) — kısa vadede fiyat hareketi baskın.'}
                {analysis.timeHorizon === 'MEDIUM_TERM' && 'Üçü de yakın ağırlıkta (~0.35) — dengeli karar.'}
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Piyasa Rejimi</div>
              <div className="text-white font-bold">
                {regimeLabel[analysis.regime] || analysis.regime}
                <span className="text-gray-500 font-normal"> ({analysis.regimeStrength})</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                ADX = <span className="text-gray-300 font-mono">{analysis.adx.toFixed(1)}</span>{' '}
                {analysis.adx > 25 ? '(trend güçlü)' : '(trend zayıf)'} · CHOP ={' '}
                <span className="text-gray-300 font-mono">{analysis.chop.toFixed(1)}</span>{' '}
                {analysis.chop > 61.8 ? '(yatay)' : '(yönlü)'}
              </div>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <div className="text-xs text-blue-300 uppercase tracking-wider mb-2">Formül</div>
            <div className="font-mono text-sm text-gray-200">{formula}</div>
            <div className="text-xs text-gray-500 mt-2 leading-relaxed">
              Her ajan 0-100 arasında skor üretir. Ağırlıklar zaman ufkuna ve ADX'e göre otomatik
              ayarlanır. Final skor {'>'}65 → AL, 55–65 → TUT, 40–55 → İZLE, {'<'}40 → SAT.
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-4 flex items-start gap-3">
            <span className="text-lg">🎯</span>
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-gray-200">Güven seviyesi: </span>
              <span className="font-mono text-blue-300">{analysis.confidenceLevel.toFixed(1)}/10</span>
              <span className="text-gray-400"> — </span>
              <span className="text-gray-400">{analysis.caveat}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ============================ 4 AGENTS ============================ */}
      <div>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-lg font-bold text-white">Ajan Detayları</h2>
          <span className="text-xs text-gray-500">Her ajanın skorunu nasıl hesapladığı, hangi veriyi kullandığı</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <AgentCard
            title="1) Temel Analiz Ajanı"
            purpose="Şirketin finansal sağlığı: P/E, ROE, borç, büyüme, FCF"
            weight={analysis.weights.fundamental}
            score={analysis.fundamentalScore}
            rationale={analysis.fundamentalRationale}
            sourceNote={analysis.dataSources.fundamentals}
            inputsBlock={
              <div className="text-[11px] text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                {analysis.inputs.pe !== undefined && (
                  <div>P/E: <span className="text-gray-300 font-mono">{analysis.inputs.pe.toFixed(1)}</span> <span className="text-gray-600">(sektör {analysis.inputs.sectorPE?.toFixed(1)})</span></div>
                )}
                {analysis.inputs.roe !== undefined && (
                  <div>ROE: <span className="text-gray-300 font-mono">{pct(analysis.inputs.roe, 0)}</span> <span className="text-gray-600">(sek {pct(analysis.inputs.sectorROE || 0, 0)})</span></div>
                )}
                {analysis.inputs.debtToEquity !== undefined && (
                  <div>D/E: <span className="text-gray-300 font-mono">{analysis.inputs.debtToEquity.toFixed(2)}</span></div>
                )}
                {analysis.inputs.epsGrowth3y !== undefined && (
                  <div>EPS 3y: <span className="text-gray-300 font-mono">{pct(analysis.inputs.epsGrowth3y, 0)}</span></div>
                )}
              </div>
            }
          />

          <AgentCard
            title="2) Makro & Sektör Ajanı"
            purpose="Fed, enflasyon, sektör rüzgarı, beta, göreceli güç"
            weight={analysis.weights.macro}
            score={analysis.macroScore}
            rationale={analysis.macroRationale}
            sourceNote={analysis.dataSources.macro}
            inputsBlock={
              <div className="text-[11px] text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                <div>Fed: <span className="text-gray-300">{analysis.inputs.fedStance || '—'}</span></div>
                <div>Enflasyon: <span className="text-gray-300">{analysis.inputs.inflationStatus || '—'}</span></div>
                <div>Sektör: <span className="text-gray-300">{analysis.inputs.sectorTailwind || '—'}</span></div>
                <div>Sentiment: <span className="text-gray-300">{analysis.inputs.sentiment || '—'}</span></div>
                <div>Beta: <span className="text-gray-300 font-mono">{analysis.inputs.beta.toFixed(2)}</span></div>
                <div>RS: <span className="text-gray-300 font-mono">{analysis.inputs.rs.toFixed(2)}</span></div>
              </div>
            }
          />

          <AgentCard
            title="3) Teknik Analiz Ajanı"
            purpose="Trend, momentum, ADX/CHOP ile rejim eşleştirme"
            weight={analysis.weights.technical}
            score={analysis.technicalScore}
            rationale={analysis.technicalRationale}
            sourceNote={analysis.dataSources.technicals}
            inputsBlock={
              <div className="text-[11px] text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                <div>ADX: <span className="text-gray-300 font-mono">{analysis.adx.toFixed(1)}</span></div>
                <div>CHOP: <span className="text-gray-300 font-mono">{analysis.chop.toFixed(1)}</span></div>
                <div>Rejim: <span className="text-gray-300">{analysis.regime}</span></div>
                <div>Güç: <span className="text-gray-300">{analysis.regimeStrength}</span></div>
              </div>
            }
          />

          {/* Risk / decision agent (agents 4+5 combined visually) */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-white">4) Risk & Karar Ajanı</div>
                <div className="text-xs text-gray-400 mt-0.5">Kelly pozisyon boyutu, stress test, VAR, anti-bias</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-3xl font-bold ${scoreColor(analysis.stressTest.passCount * 33).text}`}>
                  {analysis.stressTest.passCount}/3
                </div>
                <div className="text-[11px] text-gray-500">stress geçti</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 rounded p-2">
                <div className="text-gray-500 text-[10px] uppercase">Kelly</div>
                <div className="text-purple-200 font-mono">{analysis.positionSize.kellyCriterion !== undefined ? pct(analysis.positionSize.kellyCriterion, 2) : '—'}</div>
              </div>
              <div className="bg-black/30 rounded p-2">
                <div className="text-gray-500 text-[10px] uppercase">Volatilite Ayar</div>
                <div className="text-purple-200 font-mono">{analysis.positionSize.volatilityAdjustment !== undefined ? analysis.positionSize.volatilityAdjustment.toFixed(2) + '×' : '—'}</div>
              </div>
              <div className="bg-black/30 rounded p-2">
                <div className="text-gray-500 text-[10px] uppercase">Final Pozisyon</div>
                <div className="text-purple-200 font-mono">{analysis.positionSize.finalPosition.toFixed(2)}%</div>
              </div>
              <div className="bg-black/30 rounded p-2">
                <div className="text-gray-500 text-[10px] uppercase">Max Gün. Kayıp</div>
                <div className="text-red-300 font-mono">${analysis.positionSize.maxDailyLoss.toFixed(0)}</div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 pt-2 border-t border-purple-500/20">
              📡 Kaynak: Kelly = (W·R − L) / R · hesaplanan. Stress test: Faiz Şoku + Sektör Headwind + Earnings Miss senaryoları.
            </div>
          </div>
        </div>
      </div>

      {/* ==================== CORPORATE INTELLIGENCE (Agent 5) ==================== */}
      {corporate && (
        <Section
          title="Kurumsal İstihbarat"
          subtitle={`${corporate.dataCompleteness.news} haber · ${corporate.peers.length} peer · Agent 5${corporate.dataCompleteness.llmSynthesis ? ' · Gemini 2.0 Flash sentezi' : ' · heuristik skor'}`}
        >
          <div className="space-y-4">
            {/* Qualitative score + narrative */}
            <div className={`rounded-lg p-4 border ${scoreColor(corporate.qualitativeScore).bg} ${scoreColor(corporate.qualitativeScore).border}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Kalitatif Skor (Agent 5)</div>
                  <div className={`text-2xl font-bold ${scoreColor(corporate.qualitativeScore).text}`}>
                    {corporate.qualitativeScore}/100
                  </div>
                </div>
                {corporate.analystConsensus && (
                  <div className="text-right text-xs">
                    <div className="text-gray-400 uppercase tracking-wider">Analist</div>
                    <div className={`font-bold ${corporate.analystConsensus.label === 'BUY' ? 'text-emerald-300' : corporate.analystConsensus.label === 'SELL' ? 'text-red-300' : 'text-gray-300'}`}>
                      {corporate.analystConsensus.label}
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {corporate.analystConsensus.strongBuy + corporate.analystConsensus.buy} AL ·{' '}
                      {corporate.analystConsensus.hold} TUT ·{' '}
                      {corporate.analystConsensus.sell + corporate.analystConsensus.strongSell} SAT
                    </div>
                  </div>
                )}
              </div>
              {corporate.narrativeSummary && (
                <p className="text-sm text-gray-300 leading-relaxed">{corporate.narrativeSummary}</p>
              )}
            </div>

            {/* Company profile */}
            {corporate.profile.name && (
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Şirket Hakkında</div>
                <div className="flex items-start gap-3">
                  {corporate.profile.logo && (
                    <img src={corporate.profile.logo} alt={corporate.profile.name} className="w-10 h-10 rounded object-contain bg-white/5 p-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">{corporate.profile.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {corporate.profile.sector} · {corporate.profile.country}
                      {corporate.profile.ipo && corporate.profile.ipo !== '?' && ` · IPO ${corporate.profile.ipo.slice(0, 4)}`}
                      {corporate.profile.marketCap > 0 && ` · $${(corporate.profile.marketCap / 1000).toFixed(1)}B pazar değeri`}
                    </div>
                    {corporate.companySnapshot && (
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">{corporate.companySnapshot}</p>
                    )}
                    {corporate.profile.website && (
                      <a href={corporate.profile.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 mt-2 inline-block">
                        {corporate.profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent moves timeline */}
            {corporate.recentMoves.length > 0 && (
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-3">
                  Son Dönem Hamleleri (30 gün)
                </div>
                <ul className="space-y-2">
                  {corporate.recentMoves.map((m, i) => {
                    const sentimentColor =
                      m.sentiment === 'positive' ? 'text-emerald-400' :
                      m.sentiment === 'negative' ? 'text-red-400' : 'text-gray-400';
                    const sentimentIcon =
                      m.sentiment === 'positive' ? '⊕' :
                      m.sentiment === 'negative' ? '⊖' : '○';
                    const typeBadge =
                      m.type === 'M&A' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                      m.type === 'Partnership' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                      m.type === 'Product' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                      m.type === 'Earnings' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                      m.type === 'Regulatory' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                      m.type === 'Management' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' :
                      'bg-gray-500/20 text-gray-300 border-gray-500/30';
                    return (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className={`${sentimentColor} font-bold shrink-0`}>{sentimentIcon}</span>
                        <span className="text-gray-500 text-xs font-mono shrink-0 pt-0.5 w-20">{m.date}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${typeBadge} shrink-0 font-semibold`}>
                          {m.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          {m.url ? (
                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition">
                              {m.title}
                            </a>
                          ) : (
                            <span className="text-gray-300">{m.title}</span>
                          )}
                          {m.source && m.source !== '—' && (
                            <span className="text-[11px] text-gray-500 ml-2">· {m.source}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Competitive edge */}
            {(corporate.competitiveEdge.length > 0 || corporate.peers.length > 0) && (
              <div className="bg-black/20 rounded-lg p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider">
                    Rakiplerden Farkı
                  </div>
                  {corporate.peers.length > 0 && (
                    <div className="text-[11px] text-gray-500">
                      Peers: <span className="text-gray-400 font-mono">{corporate.peers.join(', ')}</span>
                    </div>
                  )}
                </div>
                {corporate.competitiveEdge.length > 0 ? (
                  <ul className="space-y-1.5">
                    {corporate.competitiveEdge.map((e, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-emerald-400 shrink-0">✓</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Son 30 gün haberlerinden somut rekabet farkı çıkarılamadı.
                  </p>
                )}
              </div>
            )}

            {/* Management & insider */}
            {(corporate.managementAssessment || corporate.insiderBuying || corporate.analystConsensus) && (
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-3">
                  Yönetim & İçeriden Alım
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  {corporate.insiderBuying && (
                    <div>
                      <div className="text-gray-500 uppercase text-[10px]">İçeriden Alım</div>
                      <div className={`font-bold ${
                        corporate.insiderBuying === 'POSITIVE' ? 'text-emerald-300' :
                        corporate.insiderBuying === 'NEGATIVE' ? 'text-red-300' : 'text-gray-300'
                      }`}>{corporate.insiderBuying}</div>
                    </div>
                  )}
                  {corporate.analystConsensus && (
                    <div>
                      <div className="text-gray-500 uppercase text-[10px]">Analist Konsensüs</div>
                      <div className="text-gray-300 font-mono">
                        {corporate.analystConsensus.strongBuy + corporate.analystConsensus.buy}/{corporate.analystConsensus.hold}/{corporate.analystConsensus.sell + corporate.analystConsensus.strongSell}
                      </div>
                    </div>
                  )}
                </div>
                {corporate.managementAssessment && (
                  <p className="text-sm text-gray-300 leading-relaxed">{corporate.managementAssessment}</p>
                )}
              </div>
            )}

            {/* Key risks from corporate news */}
            {corporate.keyRisks.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <div className="text-[11px] text-red-300 uppercase tracking-wider mb-2">
                  Haberlerden Çıkan Riskler
                </div>
                <ul className="space-y-1.5">
                  {corporate.keyRisks.map((r, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-red-400 shrink-0">⚠</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data coverage */}
            <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>{corporate.dataCompleteness.profile ? '✓' : '✗'} Profil</span>
              <span>{corporate.dataCompleteness.news > 0 ? '✓' : '✗'} {corporate.dataCompleteness.news} haber</span>
              <span>{corporate.dataCompleteness.peers > 0 ? '✓' : '✗'} Peers</span>
              <span>{corporate.dataCompleteness.analyst ? '✓' : '✗'} Analist</span>
              <span>{corporate.dataCompleteness.insider ? '✓' : '—'} Insider</span>
              <span>{corporate.dataCompleteness.llmSynthesis ? '✓ Gemini sentezi' : '— Heuristik fallback'}</span>
            </div>
          </div>
        </Section>
      )}

      {/* ======================== PRICE TARGETS ======================== */}
      <Section title="Fiyat Hedefleri & İşlem Planı" subtitle="Giriş bölgesi, hedef, stop — risk/ödül 1:R">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Giriş Bölgesi</div>
            <div className="text-lg font-bold text-blue-200 font-mono">
              ${analysis.entryZone.lower.toFixed(2)} – ${analysis.entryZone.upper.toFixed(2)}
            </div>
            <div className="text-[11px] text-gray-500 mt-2">Spot fiyat ve teknik skordan türetildi</div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Hedef Fiyat</div>
            <div className="text-lg font-bold text-emerald-200 font-mono">${analysis.targetPrice.toFixed(2)}</div>
            <div className={`text-[11px] mt-2 ${targetUpPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {targetUpPct >= 0 ? '▲' : '▼'} {Math.abs(targetUpPct).toFixed(1)}% spot'tan
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Stop-Loss</div>
            <div className="text-lg font-bold text-red-200 font-mono">${analysis.stopLoss.toFixed(2)}</div>
            <div className="text-[11px] text-gray-500 mt-2">
              {stopDownPct.toFixed(1)}% aşağı · R:R = <span className="text-gray-300 font-mono">{analysis.riskRewardRatio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {(analysis.support.length > 0 || analysis.resistance.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">🟢 Destek</div>
              <div className="space-y-1">
                {analysis.support.map((l, i) => (
                  <div key={i} className="text-sm text-emerald-300 font-mono">${l.toFixed(2)}</div>
                ))}
              </div>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">🔴 Direnç</div>
              <div className="space-y-1">
                {analysis.resistance.map((l, i) => (
                  <div key={i} className="text-sm text-red-300 font-mono">${l.toFixed(2)}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ======================== BULL / BEAR ======================== */}
      <Section title="Bull & Bear Senaryoları" subtitle="Anti-bias analiz — olumlu ve olumsuz tez bir arada">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-bold text-emerald-300 mb-2">✓ Bull — Neden AL / TUT?</div>
            {analysis.bullCase.length === 0 ? (
              <div className="text-xs text-gray-500 italic">Güçlü bull argüman yok.</div>
            ) : (
              <ul className="space-y-1.5">
                {analysis.bullCase.map((p, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="text-sm font-bold text-red-300 mb-2">✕ Bear — Hangi riskler?</div>
            {analysis.bearCase.length === 0 ? (
              <div className="text-xs text-gray-500 italic">Belirgin risk tespit edilmedi.</div>
            ) : (
              <div className="space-y-2">
                {analysis.bearCase.map((b, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 rounded p-2.5">
                    <div className="text-sm font-bold text-red-300">{b.scenario}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{b.trigger}</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Etki: <span className="text-gray-300">{b.impact}</span> · Olasılık:{' '}
                      <span className="text-gray-300 font-mono">{(b.probability * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ======================== STRESS TEST ======================== */}
      <Section title="Stress Test" subtitle="3 senaryoda dayanıklılık: Faiz Şoku · Sektör Headwind · Earnings Miss" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-center">
            <div className="text-[11px] text-gray-400 uppercase">Geçti</div>
            <div className="text-2xl font-bold text-emerald-300">{analysis.stressTest.passCount}/3</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-center">
            <div className="text-[11px] text-gray-400 uppercase">Başarısız</div>
            <div className="text-2xl font-bold text-red-300">{analysis.stressTest.failCount}/3</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-center">
            <div className="text-[11px] text-gray-400 uppercase">Tavsiye</div>
            <div className="text-xl font-bold text-blue-300">{analysis.stressTest.recommendation}</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Stress test, pozisyon boyutunu otomatik ayarlar. {analysis.stressTest.failCount} başarısız senaryo varsa
          {' '}Kelly'den çıkan pozisyon {analysis.stressTest.recommendation === 'FAIL' ? '×0.5 küçültülür' :
           analysis.stressTest.recommendation === 'CAUTION' ? '×0.75 hafif azaltılır' : 'aynen uygulanır'}.
        </p>
      </Section>

      {/* ==================== DATA QUALITY / SOURCES ==================== */}
      <Section title="Veri Kalitesi & Kaynaklar" subtitle="Hangi API hangi ajanı besledi" defaultOpen={false}>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="bg-black/20 rounded p-3">
            <div className="text-[11px] text-gray-400 uppercase mb-1">Veri Kalite Skoru</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${scoreColor(analysis.dataQualityScore).text}`}>{analysis.dataQualityScore}</span>
              <span className="text-xs text-gray-500">/100</span>
            </div>
          </div>
          <div className="bg-black/20 rounded p-3">
            <div className="text-[11px] text-gray-400 uppercase mb-1">Analiz Zamanı</div>
            <div className="text-sm text-gray-300">{new Date(analysis.timestamp).toLocaleString('tr-TR')}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs">
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-24">💲 Fiyat:</span>
            <span className="text-gray-300">{analysis.dataSources.price}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-24">📊 Temel:</span>
            <span className="text-gray-300">{analysis.dataSources.fundamentals}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-24">📈 Teknik:</span>
            <span className="text-gray-300">{analysis.dataSources.technicals}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 shrink-0 w-24">🌍 Makro:</span>
            <span className="text-gray-300">{analysis.dataSources.macro}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded text-[11px] text-yellow-200/80 leading-relaxed">
          ⚠️ <strong>Şeffaflık notu:</strong> Eksik/sentetik veri olan alanlar nötr (50) skor alır. Sektör referansları
          şu an statik default'larla dönüyor — FRED + sektör API entegrasyonu tamamlandığında tüm makro rakamlar canlı olacak.
        </div>
      </Section>
    </div>
  );
}
