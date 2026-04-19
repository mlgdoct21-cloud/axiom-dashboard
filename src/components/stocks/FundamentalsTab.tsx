'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('@/components/charts/PriceChart'), { ssr: false });

interface FundamentalsTabProps {
  symbol: string;
  locale: 'en' | 'tr';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPct  = (v: number | null | undefined) => v != null ? `${(v * 100).toFixed(1)}%` : 'N/A';
const fmtB    = (v: number | null | undefined) => v != null ? `$${(v / 1e9).toFixed(1)}B` : 'N/A';
const fmtNum  = (v: number | null | undefined, dec = 2) => v != null ? v.toFixed(dec) : 'N/A';
const fmtCap  = (v: number | null | undefined) => {
  if (v == null) return 'N/A';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
};

function decisionColor(d: string) {
  if (d === 'AL')   return '#26de81';
  if (d === 'SAT')  return '#ff4757';
  if (d === 'TUT')  return '#4fc3f7';
  return '#ff9800';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ h = 4, w = 'full' }: { h?: number; w?: string }) {
  return (
    <div
      className={`bg-[#2a2a3e] rounded animate-pulse w-${w}`}
      style={{ height: `${h * 4}px` }}
    />
  );
}

// ─── Quick metric cell ────────────────────────────────────────────────────────
function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
      <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-1">{label}</div>
      <div className="font-semibold text-sm" style={{ color: color || '#e0e0f0' }}>{value}</div>
    </div>
  );
}

// ─── Agent 1 — Adli Muhasebeci ────────────────────────────────────────────────
function Agent1Card({ data }: { data: any }) {
  if (data?.error) return <ErrorCard msg={data.error} />;
  const ratingColor = (r: string) => r === 'GÜÇLÜ' ? '#26de81' : r === 'ZAYIF' || r === 'ŞÜPHELİ' ? '#ff4757' : '#ff9800';

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[#666680] uppercase tracking-wider">Genel Değerlendirme</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: ratingColor(data?.overallRating), background: ratingColor(data?.overallRating) + '22' }}>
            {data?.overallRating}
          </span>
        </div>
        <p className="text-sm text-[#c0c0d0] leading-relaxed">{data?.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Earnings Quality */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">Kazanç Kalitesi</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold" style={{ color: ratingColor(data?.earningsQuality?.rating) }}>{data?.earningsQuality?.rating}</span>
            {data?.earningsQuality?.cashConversionRatio && (
              <span className="text-xs text-[#888]">CCR: {data.earningsQuality.cashConversionRatio}x</span>
            )}
          </div>
          <p className="text-xs text-[#999] leading-relaxed">{data?.earningsQuality?.finding}</p>
          <p className="text-xs text-[#c0c0d0] mt-1 leading-relaxed">{data?.earningsQuality?.verdict}</p>
        </div>

        {/* Debt / Solvency */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#ff9800] uppercase tracking-wider mb-2">Borç & Ödeme Gücü</div>
          <span className="text-xs font-bold" style={{ color: ratingColor(data?.debtSolvency?.rating) }}>{data?.debtSolvency?.rating}</span>
          {data?.debtSolvency?.netDebtEbitda != null && (
            <div className="text-xs text-[#888] mt-1">ND/EBITDA: {data.debtSolvency.netDebtEbitda}x</div>
          )}
          {data?.debtSolvency?.interestCoverage != null && (
            <div className="text-xs text-[#888]">Faiz Karş.: {data.debtSolvency.interestCoverage}x</div>
          )}
          <p className="text-xs text-[#c0c0d0] mt-2 leading-relaxed">{data?.debtSolvency?.verdict}</p>
        </div>

        {/* DuPont */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">DuPont Analizi</div>
          {data?.dupont?.roeDriver && (
            <div className="text-xs font-bold text-[#ff9800] mb-1">{data.dupont.roeDriver}</div>
          )}
          {data?.dupont?.redFlag && (
            <div className="text-xs text-[#ff4757] mb-1">⚠ Kırmızı Bayrak</div>
          )}
          <p className="text-xs text-[#c0c0d0] leading-relaxed">{data?.dupont?.verdict}</p>
        </div>

        {/* Liquidity */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">Likidite</div>
          {data?.liquidity?.workingCapitalAdvantage && (
            <div className="text-xs text-[#26de81] mb-1">✓ İşletme Sermayesi Avantajı</div>
          )}
          <p className="text-xs text-[#c0c0d0] leading-relaxed">{data?.liquidity?.verdict}</p>
          {data?.operatingMarginTrend && (
            <div className="text-xs text-[#888] mt-2 pt-2 border-t border-[#2a2a3e]">
              <span className="text-[#ff9800]">Op. Marj Trendi:</span> {data.operatingMarginTrend}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Agent 2 — Sektör Stratejisti ─────────────────────────────────────────────
function Agent2Card({ data }: { data: any }) {
  if (data?.error) return <ErrorCard msg={data.error} />;
  const signalColor = (s: string) => s === 'AL' ? '#26de81' : s === 'SAT' ? '#ff4757' : '#ff9800';

  return (
    <div className="space-y-4">
      {/* Broker Note */}
      <div className="bg-[#0d0d1a] border border-[#4fc3f7]/30 rounded p-4">
        <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">Broker Notu</div>
        <p className="text-sm text-[#e0e0f0] leading-relaxed italic">&ldquo;{data?.brokerNote}&rdquo;</p>
        <div className="flex items-center gap-3 mt-3">
          {data?.overallSignal && (
            <span className="text-sm font-bold px-3 py-1 rounded" style={{ color: signalColor(data.overallSignal), background: signalColor(data.overallSignal) + '22' }}>
              {data.overallSignal}
            </span>
          )}
          {data?.targetPotentialPct != null && (
            <span className="text-sm text-[#26de81]">+{data.targetPotentialPct}% hedef potansiyel</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Growth Engine */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#ff9800] uppercase tracking-wider mb-2">Büyüme Motoru</div>
          {data?.growthEngine?.ebitdaMarginTrend && (
            <div className="text-xs text-[#4fc3f7] mb-1">EBITDA: {data.growthEngine.ebitdaMarginTrend}</div>
          )}
          {data?.growthEngine?.realGrowth != null && (
            <div className={`text-xs mb-2 ${data.growthEngine.realGrowth ? 'text-[#26de81]' : 'text-[#ff4757]'}`}>
              {data.growthEngine.realGrowth ? '✓ Reel büyüme' : '✗ Enflasyon altı'}
            </div>
          )}
          <p className="text-xs text-[#999] leading-relaxed">{data?.growthEngine?.analysis}</p>
        </div>

        {/* Moat */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">Rekabet Hendek</div>
          {data?.moatAnalysis?.moatType && (
            <div className="text-xs font-bold text-[#ff9800] mb-1">{data.moatAnalysis.moatType}</div>
          )}
          {data?.moatAnalysis?.grossMarginLevel && (
            <div className="text-xs text-[#888] mb-1">Brüt Marj: {data.moatAnalysis.grossMarginLevel}</div>
          )}
          {data?.moatAnalysis?.moatPresent != null && (
            <div className={`text-xs mb-2 ${data.moatAnalysis.moatPresent ? 'text-[#26de81]' : 'text-[#ff9800]'}`}>
              {data.moatAnalysis.moatPresent ? '✓ Moat mevcut' : '~ Moat belirsiz'}
            </div>
          )}
          <p className="text-xs text-[#999] leading-relaxed">{data?.moatAnalysis?.verdict}</p>
        </div>

        {/* Valuation */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#ff9800] uppercase tracking-wider mb-2">Değerleme</div>
          {data?.valuation?.overallVerdict && (
            <div className="text-xs font-bold mb-1" style={{ color: data.valuation.overallVerdict === 'UCUZ' ? '#26de81' : data.valuation.overallVerdict === 'PAHALI' ? '#ff4757' : '#ff9800' }}>
              {data.valuation.overallVerdict}
            </div>
          )}
          {data?.valuation?.pegSignal && (
            <div className="text-xs text-[#888] mb-1">PEG: {data.valuation.pegSignal}</div>
          )}
          {data?.valuation?.evEbitdaSignal && (
            <div className="text-xs text-[#888] mb-2">EV/EBITDA: {data.valuation.evEbitdaSignal}</div>
          )}
          <p className="text-xs text-[#999] leading-relaxed">{data?.valuation?.analysis}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Agent 3 — Şeytanın Avukatı ──────────────────────────────────────────────
function Agent3Card({ data }: { data: any }) {
  if (data?.error) return <ErrorCard msg={data.error} />;
  const riskColor = (s: string) => s === 'DÜŞÜK' ? '#26de81' : s === 'YÜKSEK' || s === 'KRİTİK' ? '#ff4757' : '#ff9800';

  return (
    <div className="space-y-4">
      {/* Risk Level + Defense */}
      <div className="bg-[#0d0d1a] border border-[#ff4757]/30 rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#ff4757] uppercase tracking-wider">Genel Risk Seviyesi</span>
          {data?.overallRiskLevel && (
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: riskColor(data.overallRiskLevel), background: riskColor(data.overallRiskLevel) + '22' }}>
              {data.overallRiskLevel}
            </span>
          )}
        </div>
        {data?.defenseStrategy && (
          <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.defenseStrategy}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Market Risk */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#ff9800] uppercase tracking-wider mb-2">Piyasa Riski</div>
          {data?.marketRisk?.beta != null && (
            <div className="text-xs text-[#c0c0d0] mb-1">Beta: <span className="font-bold">{data.marketRisk.beta}</span></div>
          )}
          {data?.marketRisk?.shortInterestSignal && (
            <div className="text-xs text-[#888] mb-1">Short: {data.marketRisk.shortInterestSignal}</div>
          )}
          {data?.marketRisk?.liquidityRisk && (
            <div className="text-xs mb-2" style={{ color: riskColor(data.marketRisk.liquidityRisk) }}>Likidite Riski: {data.marketRisk.liquidityRisk}</div>
          )}
          <p className="text-xs text-[#999] leading-relaxed">{data?.marketRisk?.betaInterpretation}</p>
        </div>

        {/* Insider Signal */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">İçeriden Alım/Satım</div>
          {data?.insiderSignal && (
            <div className="text-sm font-bold mb-2" style={{ color: data.insiderSignal === 'POZİTİF' ? '#26de81' : data.insiderSignal === 'NEGATİF' ? '#ff4757' : '#888' }}>
              {data.insiderSignal}
            </div>
          )}
        </div>
      </div>

      {/* Red Flags */}
      {data?.financialRedFlags?.length > 0 && (
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#ff4757] uppercase tracking-wider mb-3">Kırmızı Bayraklar</div>
          <div className="space-y-2">
            {data.financialRedFlags.map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-bold" style={{ color: riskColor(f.severity), background: riskColor(f.severity) + '22' }}>{f.severity}</span>
                <div>
                  <div className="text-xs font-semibold text-[#e0e0f0]">{f.flag}</div>
                  <div className="text-xs text-[#888]">{f.analysis}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bear Cases */}
      {data?.bearCases?.length > 0 && (
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#ff4757] uppercase tracking-wider mb-3">Ayı Senaryoları</div>
          <div className="space-y-2">
            {data.bearCases.map((b: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-[#2a2a3e] last:border-0">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-[#e0e0f0]">{b.scenario}</div>
                  <div className="text-xs text-[#888]">{b.trigger}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-[#ff4757] font-bold">{b.priceImpact}</div>
                  <div className="text-[10px] text-[#666]">%{Math.round((b.probability || 0) * 100)} olasılık</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent 4 — Teknik Stratejist ──────────────────────────────────────────────
function Agent4Card({ data }: { data: any }) {
  if (data?.error) return <ErrorCard msg={data.error} />;
  const signalColor = (s: string) => s === 'AL' ? '#26de81' : s === 'SAT' ? '#ff4757' : '#ff9800';
  const crossColor  = (s: string) => s === 'GOLDEN_CROSS' ? '#26de81' : s === 'DEATH_CROSS' ? '#ff4757' : '#888';

  return (
    <div className="space-y-4">
      {/* Entry Strategy */}
      {data?.entryStrategy && (
        <div className="bg-[#0d0d1a] border border-[#26de81]/30 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-[#26de81] uppercase tracking-wider">Giriş / Çıkış Stratejisi</span>
            {data?.overallSignal && (
              <span className="text-sm font-bold px-3 py-1 rounded" style={{ color: signalColor(data.overallSignal), background: signalColor(data.overallSignal) + '22' }}>
                {data.overallSignal}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-[10px] text-[#666680] mb-1">Alım Bölgesi</div>
              <div className="text-sm font-bold text-[#4fc3f7]">
                ${data.entryStrategy.idealEntryLow} – ${data.entryStrategy.idealEntryHigh}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#666680] mb-1">Hedef 1 / 2</div>
              <div className="text-sm font-bold text-[#26de81]">
                ${data.entryStrategy.takeProfit1} / ${data.entryStrategy.takeProfit2}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#666680] mb-1">Stop / R:R</div>
              <div className="text-sm font-bold text-[#ff4757]">
                ${data.entryStrategy.stopLoss} <span className="text-[#888]">({data.entryStrategy.riskRewardRatio}R)</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#c0c0d0] leading-relaxed">{data.entryStrategy.rationale}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* Fibonacci */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#ff9800] uppercase tracking-wider mb-2">Fibonacci</div>
          {data?.fibonacci?.keySupport != null && (
            <div className="text-xs text-[#c0c0d0] mb-1">Destek: <span className="text-[#26de81] font-bold">${data.fibonacci.keySupport}</span></div>
          )}
          {data?.fibonacci?.keyResistance != null && (
            <div className="text-xs text-[#c0c0d0] mb-1">Direnç: <span className="text-[#ff4757] font-bold">${data.fibonacci.keyResistance}</span></div>
          )}
          {data?.fibonacci?.goldenRatioSupport != null && (
            <div className="text-xs text-[#888] mb-2">%61.8: ${data.fibonacci.goldenRatioSupport}</div>
          )}
          <p className="text-xs text-[#999] leading-relaxed">{data?.fibonacci?.analysis}</p>
        </div>

        {/* Moving Averages */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">Hareketli Ortalamalar</div>
          {data?.movingAverages?.crossStatus && (
            <div className="text-xs font-bold mb-1" style={{ color: crossColor(data.movingAverages.crossStatus) }}>
              {data.movingAverages.crossStatus.replace('_', ' ')}
            </div>
          )}
          {data?.movingAverages?.priceVsSma200 && (
            <div className={`text-xs mb-2 ${data.movingAverages.priceVsSma200 === 'ÜSTÜNDE' ? 'text-[#26de81]' : 'text-[#ff4757]'}`}>
              SMA200 {data.movingAverages.priceVsSma200}
            </div>
          )}
          <p className="text-xs text-[#999] leading-relaxed">{data?.movingAverages?.analysis}</p>
        </div>

        {/* Momentum / RSI */}
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-2">Momentum (RSI)</div>
          {data?.momentum?.rsiLevel != null && (
            <div className={`text-2xl font-bold mb-1 ${data.momentum.rsiLevel > 70 ? 'text-[#ff4757]' : data.momentum.rsiLevel < 30 ? 'text-[#26de81]' : 'text-[#ff9800]'}`}>
              {data.momentum.rsiLevel}
            </div>
          )}
          {data?.momentum?.rsiSignal && (
            <div className="text-xs text-[#888] mb-2">{data.momentum.rsiSignal.replace('_', ' ')}</div>
          )}
          <p className="text-xs text-[#999] leading-relaxed">{data?.momentum?.analysis}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Error card ───────────────────────────────────────────────────────────────
function ErrorCard({ msg }: { msg: string }) {
  return (
    <div className="bg-[#1a0d0d] border border-[#ff4757]/40 rounded p-4 text-sm text-[#ff9800]">
      ⚠ {msg}
    </div>
  );
}

// ─── Agent tab skeleton ───────────────────────────────────────────────────────
function AgentSkeleton() {
  return (
    <div className="space-y-3 p-1">
      <Skeleton h={5} />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton h={24} />
        <Skeleton h={24} />
      </div>
      <Skeleton h={16} />
    </div>
  );
}

// ─── Revenue trend mini chart (plain divs) ────────────────────────────────────
function RevenueTrend({ data }: { data: any[] }) {
  if (!data?.length) return null;
  const maxRev = Math.max(...data.map((r: any) => r.revenue || 0));
  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
      <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-3">Gelir Trendi (4Y)</div>
      <div className="flex items-end gap-1.5 h-16">
        {[...data].reverse().map((r: any, i: number) => {
          const h = maxRev > 0 ? Math.max(8, Math.round((r.revenue / maxRev) * 56)) : 8;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-sm bg-[#4fc3f7]/60" style={{ height: `${h}px` }} />
              <div className="text-[9px] text-[#555]">{r.date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FundamentalsTab({ symbol, locale }: FundamentalsTabProps) {
  const [status,      setStatus]      = useState('');
  const [metrics,     setMetrics]     = useState<any>(null);
  const [revTrend,    setRevTrend]    = useState<any[]>([]);
  const [fibonacci,   setFibonacci]   = useState<any>(null);
  const [agent1,      setAgent1]      = useState<any>(null);
  const [agent2,      setAgent2]      = useState<any>(null);
  const [agent3,      setAgent3]      = useState<any>(null);
  const [agent4,      setAgent4]      = useState<any>(null);
  const [agent5,      setAgent5]      = useState<any>(null);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState(0);
  const [indicators,  setIndicators]  = useState<string[]>(['sma']);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Reset state for new symbol
    setStatus(''); setMetrics(null); setRevTrend([]); setFibonacci(null);
    setAgent1(null); setAgent2(null); setAgent3(null); setAgent4(null); setAgent5(null);
    setDone(false); setError(null);

    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    const es = new EventSource(`/api/stock/deep-analysis/stream?symbol=${encodeURIComponent(symbol)}`);
    esRef.current = es;

    es.addEventListener('status',   e => setStatus((e as MessageEvent).data ? JSON.parse((e as MessageEvent).data).message : ''));
    es.addEventListener('raw_data', e => {
      const d = JSON.parse((e as MessageEvent).data);
      setMetrics(d.metrics);
      setRevTrend(d.revenueTrend || []);
      setFibonacci(d.fibonacci || null);
    });
    es.addEventListener('agent_1', e => setAgent1(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_2', e => setAgent2(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_3', e => setAgent3(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_4', e => setAgent4(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_5', e => setAgent5(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('done',    () => { setDone(true); es.close(); });
    es.addEventListener('error',   e => {
      try { const d = JSON.parse((e as MessageEvent).data); setError(d.message); } catch { setError('Bağlantı hatası'); }
      es.close();
    });
    es.onerror = () => { if (!done) setError('Akış kesildi'); es.close(); };

    return () => { es.close(); esRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const toggleIndicator = (ind: string) => {
    setIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  };

  const decision   = agent5?.decision ?? '';
  const score      = agent5?.score ?? null;
  const decColor   = decisionColor(decision);
  const agentReady = [agent1, agent2, agent3, agent4];

  const AGENT_TABS = [
    { label: '🔬 Muhasebeci', component: <Agent1Card data={agent1} /> },
    { label: '📈 Stratejist', component: <Agent2Card data={agent2} /> },
    { label: '🚨 Şeytan',     component: <Agent3Card data={agent3} /> },
    { label: '📐 Teknisyen',  component: <Agent4Card data={agent4} /> },
  ];

  const INDICATOR_BTNS = [
    { id: 'rsi', label: 'RSI' },
    { id: 'sma', label: 'SMA' },
    { id: 'ema', label: 'EMA' },
  ];

  return (
    <div className="p-4 space-y-4" style={{ background: '#0a0a18', minHeight: '100%' }}>

      {/* ── Status bar ── */}
      {!done && status && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs text-[#4fc3f7]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4fc3f7] animate-pulse shrink-0" />
          {status}
        </div>
      )}
      {error && (
        <div className="px-3 py-2 bg-[#1a0d0d] border border-[#ff4757]/40 rounded text-xs text-[#ff9800]">
          ⚠ {error}
        </div>
      )}

      {/* ── Hero: Agent 5 Decision ── */}
      {agent5 ? (
        <div className="bg-[#0d0d1a] border rounded-lg overflow-hidden" style={{ borderColor: decColor + '40' }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#2a2a3e] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-1">AXIOM Portföy Yöneticisi — Nihai Karar</div>
              <div className="text-xs text-[#888]">{metrics?.name} • {metrics?.sector}</div>
            </div>
            <div className="flex items-center gap-4">
              {/* Score */}
              {score != null && (
                <div className="text-center">
                  <div className="text-[10px] text-[#666680] mb-1">SKOR</div>
                  <div className="text-3xl font-bold" style={{ color: score >= 65 ? '#26de81' : score >= 40 ? '#ff9800' : '#ff4757' }}>
                    {score}
                  </div>
                  <div className="text-[10px] text-[#555]">/ 100</div>
                </div>
              )}
              {/* Decision badge */}
              {decision && (
                <div className="px-6 py-3 rounded-lg text-center" style={{ background: decColor + '22', border: `2px solid ${decColor}` }}>
                  <div className="text-[10px] text-[#888] mb-1">KARAR</div>
                  <div className="text-2xl font-black" style={{ color: decColor }}>{decision}</div>
                </div>
              )}
            </div>
          </div>

          {/* Narrative + debate */}
          <div className="px-5 py-4">
            {agent5.narrative && (
              <p className="text-sm text-[#c0c0d0] leading-relaxed mb-3">{agent5.narrative}</p>
            )}
            {agent5.committeeDebate && (
              <p className="text-xs text-[#888] leading-relaxed italic border-l-2 border-[#2a2a3e] pl-3">{agent5.committeeDebate}</p>
            )}
          </div>

          {/* Price targets */}
          <div className="grid grid-cols-4 border-t border-[#2a2a3e]">
            {[
              { label: 'Alım Bölgesi', value: agent5.entryZone ? `$${agent5.entryZone.low}–${agent5.entryZone.high}` : 'N/A', color: '#4fc3f7' },
              { label: 'Hedef Fiyat',  value: agent5.targetPrice  ? `$${agent5.targetPrice} (+${agent5.targetReturnPct}%)` : 'N/A', color: '#26de81' },
              { label: 'Stop Loss',    value: agent5.stopLoss      ? `$${agent5.stopLoss} (-${agent5.maxLossPct}%)` : 'N/A', color: '#ff4757' },
              { label: 'R/R',          value: agent5.riskRewardRatio ? `${agent5.riskRewardRatio}:1` : 'N/A', color: '#ff9800' },
            ].map((item, i) => (
              <div key={i} className="px-4 py-3 border-r border-[#2a2a3e] last:border-r-0 text-center">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Top reasons + time horizon */}
          {(agent5.topReasons?.length > 0 || agent5.timeHorizon) && (
            <div className="px-5 py-4 border-t border-[#2a2a3e] flex items-start justify-between gap-4">
              {agent5.topReasons?.length > 0 && (
                <div className="flex-1">
                  <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-2">Ana Gerekçeler</div>
                  <ul className="space-y-1">
                    {agent5.topReasons.map((r: string, i: number) => (
                      <li key={i} className="text-xs text-[#c0c0d0] flex gap-2">
                        <span style={{ color: decColor }}>{i + 1}.</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {agent5.timeHorizon && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-1">Zaman Ufku</div>
                  <div className="text-sm font-bold text-[#ff9800]">{agent5.timeHorizon.replace('_', ' ')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg p-5">
          <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-3">Nihai Karar Bekleniyor…</div>
          <div className="space-y-2">
            <Skeleton h={5} />
            <Skeleton h={3} />
            <Skeleton h={3} />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[0,1,2,3].map(i => <Skeleton key={i} h={12} />)}
          </div>
        </div>
      )}

      {/* ── Chart + Metrics split ── */}
      {metrics ? (
        <div className="grid grid-cols-5 gap-4">
          {/* Chart — 3/5 */}
          <div className="col-span-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {INDICATOR_BTNS.map(btn => (
                <button
                  key={btn.id}
                  onClick={() => toggleIndicator(btn.id)}
                  className="text-[11px] px-2.5 py-1 rounded border transition-colors"
                  style={{
                    borderColor: indicators.includes(btn.id) ? '#4fc3f7' : '#2a2a3e',
                    color: indicators.includes(btn.id) ? '#4fc3f7' : '#666680',
                    background: indicators.includes(btn.id) ? '#4fc3f722' : 'transparent',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg overflow-hidden border border-[#2a2a3e]">
              <PriceChart
                embedded={true}
                symbol={symbol}
                resolution="D"
                indicators={indicators}
                locale={locale}
                height={320}
              />
            </div>
          </div>

          {/* Metrics — 2/5 */}
          <div className="col-span-2 space-y-3">
            {/* Price + change */}
            <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4 flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-[#e0e0f0]">${metrics.currentPrice?.toFixed(2)}</div>
                <div className="text-xs text-[#888]">{metrics.name}</div>
              </div>
              {metrics.change24hPct != null && (
                <div className={`text-sm font-bold ${metrics.change24hPct >= 0 ? 'text-[#26de81]' : 'text-[#ff4757]'}`}>
                  {metrics.change24hPct >= 0 ? '+' : ''}{metrics.change24hPct?.toFixed(2)}%
                </div>
              )}
            </div>

            {/* Quick metric grid */}
            <div className="grid grid-cols-2 gap-2">
              <MetricCell label="F/K (P/E)"      value={fmtNum(metrics.pe)}              color={metrics.pe && metrics.pe < 15 ? '#26de81' : metrics.pe && metrics.pe > 30 ? '#ff4757' : '#e0e0f0'} />
              <MetricCell label="İleri F/K"       value={fmtNum(metrics.forwardPE)}       />
              <MetricCell label="ROE"             value={fmtPct(metrics.roe)}             color={metrics.roe && metrics.roe > 0.15 ? '#26de81' : '#e0e0f0'} />
              <MetricCell label="Brüt Marj"       value={fmtPct(metrics.grossMargin)}     color={metrics.grossMargin && metrics.grossMargin > 0.4 ? '#26de81' : '#e0e0f0'} />
              <MetricCell label="Net Marj"        value={fmtPct(metrics.netMargin)}       />
              <MetricCell label="Beta"            value={fmtNum(metrics.beta)}            color={metrics.beta && metrics.beta > 1.5 ? '#ff4757' : '#e0e0f0'} />
              <MetricCell label="Piyasa Değeri"   value={fmtCap(metrics.marketCap)}       />
              <MetricCell label="RSI (14)"        value={metrics.rsi?.toString() ?? 'N/A'} color={metrics.rsi > 70 ? '#ff4757' : metrics.rsi < 30 ? '#26de81' : '#ff9800'} />
              <MetricCell label="ND/EBITDA"       value={fmtNum(metrics.netDebtEbitda)}   color={metrics.netDebtEbitda && metrics.netDebtEbitda > 4 ? '#ff4757' : '#e0e0f0'} />
              <MetricCell label="Faiz Karş."      value={fmtNum(metrics.interestCoverage)} color={metrics.interestCoverage && metrics.interestCoverage < 1.5 ? '#ff4757' : '#e0e0f0'} />
            </div>

            {/* Analyst + insider */}
            <div className="grid grid-cols-2 gap-2">
              {metrics.analystBuyPct != null && (
                <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
                  <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-1">Analist Alış</div>
                  <div className="text-lg font-bold text-[#26de81]">%{metrics.analystBuyPct}</div>
                  <div className="w-full h-1 bg-[#2a2a3e] rounded mt-1">
                    <div className="h-full bg-[#26de81] rounded" style={{ width: `${metrics.analystBuyPct}%` }} />
                  </div>
                </div>
              )}
              <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
                <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-1">İçeride Alım/Satım</div>
                <div className="flex gap-3">
                  <div><span className="text-[#26de81] font-bold">{metrics.insiderBuys}</span><span className="text-[10px] text-[#555] ml-1">alım</span></div>
                  <div><span className="text-[#ff4757] font-bold">{metrics.insiderSells}</span><span className="text-[10px] text-[#555] ml-1">satış</span></div>
                </div>
              </div>
            </div>

            {/* Fibonacci key levels */}
            {fibonacci && (
              <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-4">
                <div className="text-[10px] text-[#666680] uppercase tracking-wider mb-2">Fibonacci (2Y)</div>
                <div className="space-y-1">
                  {[
                    { l: 'Ext 161.8%', v: fibonacci.ext1618, c: '#ff9800' },
                    { l: '2Y Yüksek',  v: fibonacci.high,    c: '#ff4757' },
                    { l: 'Fib 23.6%',  v: fibonacci.lvl236,  c: '#e0e0f0' },
                    { l: 'Fib 38.2%',  v: fibonacci.lvl382,  c: '#e0e0f0' },
                    { l: 'Fib 50.0%',  v: fibonacci.lvl500,  c: '#ff9800' },
                    { l: 'Fib 61.8% ✦', v: fibonacci.lvl618, c: '#4fc3f7' },
                    { l: 'Fib 78.6%',  v: fibonacci.lvl786,  c: '#e0e0f0' },
                    { l: '2Y Düşük',   v: fibonacci.low,     c: '#26de81' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-[#666680]">{row.l}</span>
                      <span className="font-mono" style={{ color: row.c }}>${row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue trend */}
            <RevenueTrend data={revTrend} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3"><Skeleton h={80} /></div>
          <div className="col-span-2 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} h={10} />)}
          </div>
        </div>
      )}

      {/* ── Agent Tabs ── */}
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg overflow-hidden">
        {/* Tab selector */}
        <div className="flex border-b border-[#2a2a3e]">
          {AGENT_TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className="flex-1 px-3 py-3 text-xs font-medium transition-colors relative"
              style={{
                color: activeTab === i ? '#4fc3f7' : '#666680',
                background: activeTab === i ? '#4fc3f711' : 'transparent',
              }}
            >
              {tab.label}
              {/* Ready indicator dot */}
              {agentReady[i] && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#26de81]" />
              )}
              {activeTab === i && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4fc3f7]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {agentReady[activeTab] ? (
            AGENT_TABS[activeTab].component
          ) : (
            <AgentSkeleton />
          )}
        </div>
      </div>

    </div>
  );
}
