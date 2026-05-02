'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import InsiderReportPanel from '@/components/stocks/InsiderReportPanel';

const PriceChart = dynamic(() => import('@/components/charts/PriceChart'), { ssr: false });

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtPct = (v: number | null | undefined) => v != null ? `${(v * 100).toFixed(1)}%` : 'N/A';
const fmtB   = (v: number | null | undefined) => v != null ? `$${(v / 1e9).toFixed(1)}B` : 'N/A';
const fmtCap = (v: number | null | undefined) => {
  if (v == null) return 'N/A';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
};
const fmtNum = (v: number | null | undefined, dec = 2) => v != null ? v.toFixed(dec) : 'N/A';

function decisionColor(d: string) {
  if (d === 'AL')   return '#26de81';
  if (d === 'SAT')  return '#ff4757';
  if (d === 'TUT')  return '#4fc3f7';
  return '#ff9800';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ h = 4 }: { h?: number }) {
  return <div className="bg-[#1e1e32] rounded animate-pulse" style={{ height: `${h * 4}px` }} />;
}

// ─── Metric cell ─────────────────────────────────────────────────────────────
function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
      <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-1">{label}</div>
      <div className="font-semibold text-sm" style={{ color: color || '#d0d0e8' }}>{value}</div>
    </div>
  );
}

// ─── Agent cards ─────────────────────────────────────────────────────────────
function RatingBadge({ r }: { r: string }) {
  const c = r === 'GÜÇLÜ' || r === 'HARİKA' ? '#26de81'
    : r === 'ZAYIF' || r === 'ŞÜPHELİ' || r === 'TEHLİKELİ' ? '#ff4757'
    : '#ff9800';
  return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: c, background: c + '22' }}>{r}</span>;
}

function Agent1Card({ d }: { d: any }) {
  if (d?.error) return <p className="text-sm text-[#ff9800]">⚠ {d.error}</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#666680]">Genel Değerlendirme</span>
        {d?.overallRating && <RatingBadge r={d.overallRating} />}
      </div>
      <p className="text-sm text-[#c0c0d0] leading-relaxed">{d?.summary}</p>
      <div className="grid grid-cols-2 gap-3">
        {d?.earningsQuality && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#4fc3f7] uppercase mb-1">Kazanç Kalitesi</div>
            <div className="flex items-center gap-2">
              {d.earningsQuality.rating && <RatingBadge r={d.earningsQuality.rating} />}
              {d.earningsQuality.cashConversionRatio != null && (
                <span className="text-[10px] text-[#888]">CCR: {d.earningsQuality.cashConversionRatio}x</span>
              )}
            </div>
            <p className="text-xs text-[#999] mt-2">{d.earningsQuality.finding}</p>
            <p className="text-xs text-[#c0c0d0] mt-1">{d.earningsQuality.verdict}</p>
          </div>
        )}
        {d?.debtSolvency && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#ff9800] uppercase mb-1">Borç & Ödeme</div>
            {d.debtSolvency.rating && <RatingBadge r={d.debtSolvency.rating} />}
            {d.debtSolvency.netDebtEbitda != null && <div className="text-xs text-[#888] mt-1">ND/EBITDA: {d.debtSolvency.netDebtEbitda}x</div>}
            {d.debtSolvency.interestCoverage != null && <div className="text-xs text-[#888]">Faiz Karş.: {d.debtSolvency.interestCoverage}x</div>}
            <p className="text-xs text-[#c0c0d0] mt-1">{d.debtSolvency.verdict}</p>
          </div>
        )}
        {d?.dupont && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#4fc3f7] uppercase mb-1">DuPont</div>
            <div className="text-xs font-bold text-[#ff9800]">{d.dupont.roeDriver}</div>
            {d.dupont.redFlag && <div className="text-xs text-[#ff4757] mt-1">⚠ Kırmızı Bayrak</div>}
            <p className="text-xs text-[#c0c0d0] mt-1">{d.dupont.verdict}</p>
          </div>
        )}
        {d?.liquidity && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#4fc3f7] uppercase mb-1">Likidite</div>
            {d.liquidity.workingCapitalAdvantage && <div className="text-xs text-[#26de81]">✓ İşletme Avantajı</div>}
            <p className="text-xs text-[#c0c0d0] mt-1">{d.liquidity.verdict}</p>
            {d?.operatingMarginTrend && (
              <div className="text-[10px] text-[#888] mt-2 pt-2 border-t border-[#2a2a3e]">
                <span className="text-[#ff9800]">Op. Marj:</span> {d.operatingMarginTrend}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Agent2Card({ d }: { d: any }) {
  if (d?.error) return <p className="text-sm text-[#ff9800]">⚠ {d.error}</p>;
  const sigColor = (s: string) => s === 'AL' ? '#26de81' : s === 'SAT' ? '#ff4757' : '#ff9800';
  return (
    <div className="space-y-3">
      {d?.brokerNote && (
        <div className="bg-[#0d0d1a] border border-[#4fc3f7]/30 rounded p-4">
          <div className="text-[10px] text-[#4fc3f7] uppercase mb-2">Broker Notu</div>
          <p className="text-sm text-[#e0e0f0] italic leading-relaxed">"{d.brokerNote}"</p>
          <div className="flex gap-3 mt-2">
            {d.overallSignal && <span className="text-sm font-bold px-3 py-1 rounded" style={{ color: sigColor(d.overallSignal), background: sigColor(d.overallSignal) + '22' }}>{d.overallSignal}</span>}
            {d.targetPotentialPct != null && <span className="text-sm text-[#26de81]">+{d.targetPotentialPct}% potansiyel</span>}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {d?.growthEngine && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#ff9800] uppercase mb-1">Büyüme</div>
            <div className="text-xs text-[#4fc3f7]">{d.growthEngine.ebitdaMarginTrend}</div>
            {d.growthEngine.realGrowth != null && <div className={`text-xs mt-1 ${d.growthEngine.realGrowth ? 'text-[#26de81]' : 'text-[#ff4757]'}`}>{d.growthEngine.realGrowth ? '✓ Reel büyüme' : '✗ Enflasyon altı'}</div>}
            <p className="text-xs text-[#999] mt-1">{d.growthEngine.analysis}</p>
          </div>
        )}
        {d?.moatAnalysis && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#4fc3f7] uppercase mb-1">Rekabet Hendek</div>
            <div className="text-xs font-bold text-[#ff9800]">{d.moatAnalysis.moatType}</div>
            {d.moatAnalysis.grossMarginLevel && <div className="text-[10px] text-[#888] mt-1">Brüt Marj: {d.moatAnalysis.grossMarginLevel}</div>}
            {d.moatAnalysis.moatPresent != null && <div className={`text-xs mt-1 ${d.moatAnalysis.moatPresent ? 'text-[#26de81]' : 'text-[#888]'}`}>{d.moatAnalysis.moatPresent ? '✓ Moat var' : '~ Belirsiz'}</div>}
            <p className="text-xs text-[#999] mt-1">{d.moatAnalysis.verdict}</p>
          </div>
        )}
        {d?.valuation && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#ff9800] uppercase mb-1">Değerleme</div>
            {d.valuation.overallVerdict && <div className="text-xs font-bold" style={{ color: d.valuation.overallVerdict === 'UCUZ' ? '#26de81' : d.valuation.overallVerdict === 'PAHALI' ? '#ff4757' : '#ff9800' }}>{d.valuation.overallVerdict}</div>}
            {d.valuation.pegSignal && <div className="text-[10px] text-[#888] mt-1">PEG: {d.valuation.pegSignal}</div>}
            {d.valuation.evEbitdaSignal && <div className="text-[10px] text-[#888]">EV/EBITDA: {d.valuation.evEbitdaSignal}</div>}
            <p className="text-xs text-[#999] mt-1">{d.valuation.analysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Agent3Card({ d }: { d: any }) {
  if (d?.error) return <p className="text-sm text-[#ff9800]">⚠ {d.error}</p>;
  const rc = (s: string) => s === 'DÜŞÜK' ? '#26de81' : s === 'YÜKSEK' || s === 'KRİTİK' ? '#ff4757' : '#ff9800';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#c0c0d0]">{d?.defenseStrategy}</p>
        {d?.overallRiskLevel && <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0 ml-3" style={{ color: rc(d.overallRiskLevel), background: rc(d.overallRiskLevel) + '22' }}>{d.overallRiskLevel}</span>}
      </div>
      {(d?.marketRisk || d?.insiderSignal) && (
        <div className="grid grid-cols-2 gap-3">
          {d?.marketRisk && (
            <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
              <div className="text-[10px] text-[#ff9800] uppercase mb-1">Piyasa Riski</div>
              {d.marketRisk.beta != null && <div className="text-xs text-[#c0c0d0]">Beta: <span className="font-bold">{d.marketRisk.beta}</span></div>}
              {d.marketRisk.shortInterestSignal && <div className="text-[10px] text-[#888]">Short: {d.marketRisk.shortInterestSignal}</div>}
              {d.marketRisk.liquidityRisk && <div className="text-[10px]" style={{ color: rc(d.marketRisk.liquidityRisk) }}>Likidite: {d.marketRisk.liquidityRisk}</div>}
              {d.marketRisk.betaInterpretation && <p className="text-xs text-[#999] mt-1">{d.marketRisk.betaInterpretation}</p>}
            </div>
          )}
          {d?.insiderSignal && (
            <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
              <div className="text-[10px] text-[#4fc3f7] uppercase mb-1">İçeriden Alım/Satım</div>
              <div className="text-sm font-bold" style={{ color: d.insiderSignal === 'POZİTİF' ? '#26de81' : d.insiderSignal === 'NEGATİF' ? '#ff4757' : '#888' }}>
                {d.insiderSignal}
              </div>
            </div>
          )}
        </div>
      )}
      {d?.financialRedFlags?.length > 0 && (
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
          <div className="text-[10px] text-[#ff4757] uppercase mb-2">Kırmızı Bayraklar</div>
          <div className="space-y-2">
            {d.financialRedFlags.map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-bold" style={{ color: rc(f.severity), background: rc(f.severity) + '22' }}>{f.severity}</span>
                <div><div className="text-xs font-semibold text-[#e0e0f0]">{f.flag}</div><div className="text-xs text-[#888]">{f.analysis}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {d?.bearCases?.length > 0 && (
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
          <div className="text-[10px] text-[#ff4757] uppercase mb-2">Ayı Senaryoları</div>
          {d.bearCases.map((b: any, i: number) => (
            <div key={i} className="flex justify-between py-1.5 border-b border-[#2a2a3e] last:border-0">
              <div><div className="text-xs font-semibold text-[#e0e0f0]">{b.scenario}</div><div className="text-xs text-[#888]">{b.trigger}</div></div>
              <div className="text-right shrink-0 ml-3"><div className="text-xs text-[#ff4757] font-bold">{b.priceImpact}</div><div className="text-[10px] text-[#555]">%{Math.round((b.probability || 0) * 100)}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Agent4Card({ d }: { d: any }) {
  if (d?.error) return <p className="text-sm text-[#ff9800]">⚠ {d.error}</p>;
  const sigColor = (s: string) => s === 'AL' ? '#26de81' : s === 'SAT' ? '#ff4757' : '#ff9800';
  const crossColor = (s: string) => s === 'GOLDEN_CROSS' ? '#26de81' : s === 'DEATH_CROSS' ? '#ff4757' : '#888';
  return (
    <div className="space-y-3">
      {d?.entryStrategy && (
        <div className="bg-[#0d0d1a] border border-[#26de81]/30 rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-[#26de81] uppercase tracking-wider">Giriş / Çıkış Stratejisi</span>
            {d.overallSignal && <span className="text-sm font-bold px-3 py-1 rounded" style={{ color: sigColor(d.overallSignal), background: sigColor(d.overallSignal) + '22' }}>{d.overallSignal}</span>}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3 text-center">
            <div><div className="text-[10px] text-[#555] mb-1">Alım Bölgesi</div><div className="text-sm font-bold text-[#4fc3f7]">${d.entryStrategy.idealEntryLow}–${d.entryStrategy.idealEntryHigh}</div></div>
            <div><div className="text-[10px] text-[#555] mb-1">Hedef 1 / 2</div><div className="text-sm font-bold text-[#26de81]">${d.entryStrategy.takeProfit1} / ${d.entryStrategy.takeProfit2}</div></div>
            <div><div className="text-[10px] text-[#555] mb-1">Stop / R:R</div><div className="text-sm font-bold text-[#ff4757]">${d.entryStrategy.stopLoss} <span className="text-[#666]">({d.entryStrategy.riskRewardRatio}R)</span></div></div>
          </div>
          <p className="text-xs text-[#c0c0d0]">{d.entryStrategy.rationale}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {d?.fibonacci && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#ff9800] uppercase mb-1">Fibonacci</div>
            {d.fibonacci.keySupport != null && <div className="text-xs text-[#c0c0d0]">Destek: <span className="text-[#26de81] font-bold">${d.fibonacci.keySupport}</span></div>}
            {d.fibonacci.keyResistance != null && <div className="text-xs text-[#c0c0d0]">Direnç: <span className="text-[#ff4757] font-bold">${d.fibonacci.keyResistance}</span></div>}
            {d.fibonacci.goldenRatioSupport != null && <div className="text-[10px] text-[#888]">%61.8: ${d.fibonacci.goldenRatioSupport}</div>}
            <p className="text-xs text-[#999] mt-1">{d.fibonacci.analysis}</p>
          </div>
        )}
        {d?.movingAverages && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#4fc3f7] uppercase mb-1">Hareketli Ort.</div>
            {d.movingAverages.crossStatus && <div className="text-xs font-bold mb-1" style={{ color: crossColor(d.movingAverages.crossStatus) }}>{d.movingAverages.crossStatus.replace('_', ' ')}</div>}
            {d.movingAverages.priceVsSma200 && <div className={`text-xs mb-1 ${d.movingAverages.priceVsSma200 === 'ÜSTÜNDE' ? 'text-[#26de81]' : 'text-[#ff4757]'}`}>SMA200 {d.movingAverages.priceVsSma200}</div>}
            <p className="text-xs text-[#999] mt-1">{d.movingAverages.analysis}</p>
          </div>
        )}
        {d?.momentum && (
          <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
            <div className="text-[10px] text-[#4fc3f7] uppercase mb-1">RSI</div>
            {d.momentum.rsiLevel != null && <div className={`text-2xl font-bold ${d.momentum.rsiLevel > 70 ? 'text-[#ff4757]' : d.momentum.rsiLevel < 30 ? 'text-[#26de81]' : 'text-[#ff9800]'}`}>{d.momentum.rsiLevel}</div>}
            {d.momentum.rsiSignal && <div className="text-xs text-[#888]">{d.momentum.rsiSignal.replace('_', ' ')}</div>}
            <p className="text-xs text-[#999] mt-1">{d.momentum.analysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Revenue mini bar ─────────────────────────────────────────────────────────
function fmtRevM(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9)  return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6)  return `${(v / 1e6).toFixed(0)}M`;
  if (abs >= 1e3)  return `${(v / 1e3).toFixed(0)}K`;
  return v === 0 ? '—' : String(v);
}

function RevBar({ data }: { data: any[] }) {
  if (!data?.length) return null;
  const maxR = Math.max(...data.map((r: any) => r.revenue || 0));
  const isPreRevenue = maxR === 0;
  const maxVal = isPreRevenue
    ? Math.max(...data.map((r: any) => Math.abs(r.netIncome || 0)))
    : maxR;

  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[10px] text-[#555570] uppercase tracking-wider">
          {isPreRevenue ? 'Gider Trendi (4Y)' : 'Gelir Trendi (4Y)'}
        </div>
        {isPreRevenue && (
          <span className="text-[9px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded px-1 py-0.5">
            PRE-REVENUE
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        {[...data].reverse().map((r: any, i: number) => {
          const val = isPreRevenue ? Math.abs(r.netIncome || 0) : (r.revenue || 0);
          const isProfit = isPreRevenue ? false : (r.netIncome ?? 0) >= 0;
          const h = maxVal > 0 ? Math.max(44, Math.round((val / maxVal) * 64)) : 44;
          const bg = isProfit ? 'bg-emerald-500/70' : 'bg-red-500/70';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded flex flex-col items-center justify-center gap-0.5 ${bg}`}
                style={{ height: `${h}px` }}
              >
                <span className="text-[9px] font-bold font-mono text-white leading-tight">
                  {fmtRevM(val)}
                </span>
                {!isPreRevenue && r.operatingMargin !== 0 && r.operatingMargin != null && (
                  <span className="text-[8px] text-white/70">
                    %{r.operatingMargin > 0 ? '+' : ''}{r.operatingMargin}
                  </span>
                )}
              </div>
              <div className="text-[9px] text-[#444]">{r.date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Symbol quick buttons ─────────────────────────────────────────────────────
const US_SYMS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NFLX'];
const TR_SYMS = ['ASELS', 'GARAN', 'KCHOL', 'THYAO', 'AKBNK', 'BIMAS'];

// ─── Main ─────────────────────────────────────────────────────────────────────
import { useSearchParams } from 'next/navigation';

interface FundamentalTabProps {
  locale: 'en' | 'tr';
  /** When provided, the tab runs in controlled mode:
   *  - Parent owns the symbol; analysis re-runs whenever this prop changes
   *  - Header / market toggle / quick-symbol buttons are hidden
   *  When omitted, the tab manages its own symbol (reads from URL, shows controls). */
  symbol?: string;
}

export default function FundamentalTab({ locale, symbol: symbolProp }: FundamentalTabProps) {
  const controlled = symbolProp !== undefined;
  const searchParams = useSearchParams();
  const telegramSymbol = searchParams?.get('symbol');
  const telegramReport = searchParams?.get('report');

  const [symbol,      setSymbol]      = useState(() => symbolProp || telegramSymbol || 'AAPL');
  const [input,       setInput]       = useState('');
  const [market,      setMarket]      = useState<'US' | 'TR'>('US');
  const [indicators,  setIndicators]  = useState<string[]>(['sma']);
  const [activeTab,   setActiveTab]   = useState(0);
  const [autoOpenReport, setAutoOpenReport] = useState(telegramReport === 'telegram');

  // SSE state
  const [status,    setStatus]    = useState('');
  const [metrics,   setMetrics]   = useState<any>(null);
  const [revTrend,  setRevTrend]  = useState<any[]>([]);
  const [fibonacci, setFibonacci] = useState<any>(null);
  const [latestQ,   setLatestQ]   = useState<any>(null);
  const [agent1,    setAgent1]    = useState<any>(null);
  const [agent2,    setAgent2]    = useState<any>(null);
  const [agent3,    setAgent3]    = useState<any>(null);
  const [agent4,    setAgent4]    = useState<any>(null);
  const [agent5,    setAgent5]    = useState<any>(null);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const insiderReportRef = useRef<any>(null);

  const runAnalysis = (sym: string, force = false) => {
    setStatus(''); setMetrics(null); setRevTrend([]); setFibonacci(null); setLatestQ(null);
    setAgent1(null); setAgent2(null); setAgent3(null); setAgent4(null); setAgent5(null);
    setDone(false); setError(null); setActiveTab(0);
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    // Cache-bust query param when forced; backend itself doesn't read it but it
    // forces the browser/edge to issue a fresh request.
    const bust = force ? `&t=${Date.now()}` : '';
    const es = new EventSource(`/api/stock/deep-analysis/stream?symbol=${encodeURIComponent(sym)}${bust}`);
    esRef.current = es;
    es.addEventListener('status',   e => setStatus(JSON.parse((e as MessageEvent).data).message || ''));
    es.addEventListener('raw_data', e => {
      const d = JSON.parse((e as MessageEvent).data);
      setMetrics(d.metrics);
      setRevTrend(d.revenueTrend || []);
      setFibonacci(d.fibonacci || null);
      setLatestQ(d.latestReportedQuarter || null);
    });
    es.addEventListener('agent_1',  e => setAgent1(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_2',  e => setAgent2(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_3',  e => setAgent3(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_4',  e => setAgent4(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('agent_5',  e => setAgent5(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('done',     () => { setDone(true); es.close(); });
    es.addEventListener('error',    e => { try { setError(JSON.parse((e as MessageEvent).data).message); } catch { setError('Akış hatası'); } es.close(); });
    es.onerror = () => { if (!done) setError('Bağlantı kesildi'); es.close(); };
  };

  // Auto-run on first mount
  useEffect(() => { runAnalysis(symbol); return () => { esRef.current?.close(); }; }, []);

  // Controlled mode: re-run analysis whenever the parent changes the symbol prop
  useEffect(() => {
    if (!controlled) return;
    if (symbolProp && symbolProp !== symbol) {
      setSymbol(symbolProp);
      runAnalysis(symbolProp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolProp]);

  const handleSymbol = (sym: string) => { setSymbol(sym); runAnalysis(sym); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const s = input.trim().toUpperCase(); if (s) { setInput(''); handleSymbol(s); } };
  const toggleInd = (id: string) => setIndicators(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const decision  = agent5?.decision ?? '';
  const score     = agent5?.score ?? null;
  const decColor  = decisionColor(decision);

  const TABS = [
    { label: '🔬 Muhasebeci', ready: !!agent1, content: <Agent1Card d={agent1} /> },
    { label: '📈 Stratejist', ready: !!agent2, content: <Agent2Card d={agent2} /> },
    { label: '🚨 Şeytan',     ready: !!agent3, content: <Agent3Card d={agent3} /> },
    { label: '📐 Teknisyen',  ready: !!agent4, content: <Agent4Card d={agent4} /> },
  ];

  const IND_BTNS = [{ id: 'rsi', label: 'RSI' }, { id: 'sma', label: 'SMA' }, { id: 'ema', label: 'EMA' }];

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4" style={{ background: '#0a0a18', minHeight: '100%' }}>

      {/* ── Header & Controls (hidden in controlled mode; parent owns symbol UI) ── */}
      {!controlled && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">Temel Analiz</h1>
              <p className="text-xs text-[#555570]">5 Analist · Veri Hattı · Gemini 2.0 Flash</p>
            </div>

            {/* Market toggle */}
            <div className="flex gap-1 ml-auto">
              {(['US', 'TR'] as const).map(m => (
                <button key={m} onClick={() => setMarket(m)}
                  className="px-3 py-1.5 rounded text-xs font-semibold transition"
                  style={{ background: market === m ? (m === 'US' ? '#4fc3f733' : '#ff474733') : '#1a1a2e', color: market === m ? (m === 'US' ? '#4fc3f7' : '#ff4757') : '#666680', border: `1px solid ${market === m ? (m === 'US' ? '#4fc3f7' : '#ff4757') : '#2a2a3e'}` }}>
                  {m === 'US' ? '🇺🇸 ABD' : '🇹🇷 BIST'}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Sembol (örn: TSLA)" className="px-3 py-1.5 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-white placeholder-[#444] text-sm focus:ring-1 focus:ring-[#4fc3f7] focus:border-[#4fc3f7] outline-none" />
              <button type="submit" className="px-4 py-1.5 bg-[#4fc3f7] hover:bg-[#4fc3f7]/80 text-[#0a0a18] font-bold rounded text-sm transition">Analiz Et</button>
            </form>
          </div>

          {/* ── Quick symbol buttons ── */}
          <div className="flex flex-wrap gap-1.5">
            {(market === 'US' ? US_SYMS : TR_SYMS).map(sym => (
              <button key={sym} onClick={() => handleSymbol(sym)}
                className="px-3 py-1.5 rounded text-xs font-semibold transition"
                style={{ background: symbol === sym ? '#4fc3f722' : '#1a1a2e', color: symbol === sym ? '#4fc3f7' : '#666680', border: `1px solid ${symbol === sym ? '#4fc3f7' : '#2a2a3e'}` }}>
                {sym}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Status bar ── */}
      {!done && status && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-xs text-[#4fc3f7]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4fc3f7] animate-pulse shrink-0" />
          {status}
        </div>
      )}
      {error && <div className="px-3 py-2 bg-[#1a0d0d] border border-[#ff4757]/40 rounded text-xs text-[#ff9800]">⚠ {error}</div>}

      {/* ── Fresh earnings badge + manual rerun ── */}
      {(latestQ?.isFresh || done) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {latestQ?.isFresh && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold"
              style={{ background: '#26de8122', border: '1px solid #26de8166', color: '#26de81' }}
            >
              <span>🆕</span>
              <span>
                Yeni Bilanço · {latestQ.date} ({latestQ.daysAgo}g önce)
                {latestQ.epsActual != null && ` · EPS $${Number(latestQ.epsActual).toFixed(2)}`}
                {latestQ.surprisePct != null && ` (sürpriz ${latestQ.surprisePct >= 0 ? '+' : ''}${Number(latestQ.surprisePct).toFixed(1)}%)`}
              </span>
            </div>
          )}
          {done && (
            <button
              onClick={() => runAnalysis(symbol, true)}
              className="ml-auto px-3 py-1.5 rounded text-xs font-semibold transition"
              style={{ background: '#4fc3f722', border: '1px solid #4fc3f766', color: '#4fc3f7' }}
              title="Veriyi sıfırdan çek ve 5 ajanı yeniden çalıştır"
            >
              🔄 Yeniden Çalıştır
            </button>
          )}
        </div>
      )}

      {/* ── Hero: Agent 5 decision ── */}
      {agent5 ? (
        <div className="bg-[#0d0d1a] border rounded-lg overflow-hidden" style={{ borderColor: decColor + '40' }}>
          <div className="px-5 py-4 border-b border-[#2a2a3e] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-1">AXIOM · Portföy Yöneticisi — Nihai Karar</div>
              <div className="text-xs text-[#777]">{metrics?.name} · {metrics?.sector}</div>
            </div>
            <div className="flex items-center gap-4">
              {score != null && (
                <div className="text-center">
                  <div className="text-[10px] text-[#555570] mb-1">SKOR</div>
                  <div className="text-3xl font-bold" style={{ color: score >= 65 ? '#26de81' : score >= 40 ? '#ff9800' : '#ff4757' }}>{score}</div>
                  <div className="text-[10px] text-[#444]">/ 100</div>
                </div>
              )}
              <div className="px-6 py-3 rounded-lg text-center" style={{ background: decColor + '22', border: `2px solid ${decColor}` }}>
                <div className="text-[10px] text-[#777] mb-1">KARAR</div>
                <div className="text-2xl font-black" style={{ color: decColor }}>{decision}</div>
              </div>
            </div>
          </div>

          {(agent5.narrative || agent5.committeeDebate) && (
            <div className="px-5 py-4">
              {agent5.narrative && <p className="text-sm text-[#c0c0d0] leading-relaxed mb-3">{agent5.narrative}</p>}
              {agent5.committeeDebate && <p className="text-xs text-[#777] italic border-l-2 border-[#2a2a3e] pl-3">{agent5.committeeDebate}</p>}
            </div>
          )}

          <div className="grid grid-cols-4 border-t border-[#2a2a3e]">
            {[
              { l: 'Alım Bölgesi', v: agent5.entryZone ? `$${agent5.entryZone.low}–${agent5.entryZone.high}` : 'N/A', c: '#4fc3f7' },
              { l: 'Hedef Fiyat',  v: agent5.targetPrice ? `$${agent5.targetPrice} (+${agent5.targetReturnPct}%)` : 'N/A', c: '#26de81' },
              { l: 'Stop Loss',    v: agent5.stopLoss    ? `$${agent5.stopLoss} (-${agent5.maxLossPct}%)` : 'N/A', c: '#ff4757' },
              { l: 'R/R',          v: agent5.riskRewardRatio ? `${agent5.riskRewardRatio}:1` : 'N/A', c: '#ff9800' },
            ].map((item, i) => (
              <div key={i} className="px-4 py-3 border-r border-[#2a2a3e] last:border-r-0 text-center">
                <div className="text-[10px] text-[#444] uppercase mb-1">{item.l}</div>
                <div className="text-sm font-bold" style={{ color: item.c }}>{item.v}</div>
              </div>
            ))}
          </div>

          {agent5.topReasons?.length > 0 && (
            <div className="px-5 py-4 border-t border-[#2a2a3e] flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-[10px] text-[#555570] uppercase mb-2">Ana Gerekçeler</div>
                <ul className="space-y-1">
                  {agent5.topReasons.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-[#c0c0d0] flex gap-2">
                      <span style={{ color: decColor }}>{i + 1}.</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
              {agent5.timeHorizon && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#555570] uppercase mb-1">Zaman Ufku</div>
                  <div className="text-sm font-bold text-[#ff9800]">{agent5.timeHorizon.replace('_', ' ')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg p-5 space-y-3">
          <Skel h={5} /><Skel h={3} /><Skel h={3} />
          <div className="grid grid-cols-4 gap-2">{[0,1,2,3].map(i => <Skel key={i} h={12} />)}</div>
        </div>
      )}

      {/* ── Chart + Metrics ── */}
      {metrics ? (
        <div className="grid grid-cols-5 gap-4">
          {/* Chart 3/5 */}
          <div className="col-span-3 space-y-2">
            <div className="flex items-center gap-2">
              {IND_BTNS.map(b => (
                <button key={b.id} onClick={() => toggleInd(b.id)} className="text-[11px] px-2.5 py-1 rounded border transition-colors"
                  style={{ borderColor: indicators.includes(b.id) ? '#4fc3f7' : '#2a2a3e', color: indicators.includes(b.id) ? '#4fc3f7' : '#555570', background: indicators.includes(b.id) ? '#4fc3f722' : 'transparent' }}>
                  {b.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg overflow-hidden border border-[#2a2a3e]">
              <PriceChart embedded symbol={symbol} resolution="D" indicators={indicators} locale={locale} height={300} />
            </div>
          </div>

          {/* Metrics 2/5 */}
          <div className="col-span-2 space-y-2">
            <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-[#e0e0f0]">${metrics.currentPrice?.toFixed(2)}</div>
                <div className="text-xs text-[#666]">{metrics.name}</div>
              </div>
              {metrics.change24hPct != null && (
                <div className={`text-sm font-bold ${metrics.change24hPct >= 0 ? 'text-[#26de81]' : 'text-[#ff4757]'}`}>
                  {metrics.change24hPct >= 0 ? '+' : ''}{metrics.change24hPct?.toFixed(2)}%
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Cell label="F/K (P/E)"    value={fmtNum(metrics.pe)}         color={metrics.pe && metrics.pe < 15 ? '#26de81' : metrics.pe && metrics.pe > 30 ? '#ff4757' : undefined} />
              <Cell label="ROE"          value={fmtPct(metrics.roe)}        color={metrics.roe && metrics.roe > 0.15 ? '#26de81' : undefined} />
              <Cell label="Brüt Marj"    value={fmtPct(metrics.grossMargin)} />
              <Cell label="Net Marj"     value={fmtPct(metrics.netMargin)} />
              <Cell label="Beta"         value={fmtNum(metrics.beta)}       color={metrics.beta && metrics.beta > 1.5 ? '#ff4757' : undefined} />
              <Cell label="RSI (14)"     value={metrics.rsi?.toString() ?? 'N/A'} color={metrics.rsi > 70 ? '#ff4757' : metrics.rsi < 30 ? '#26de81' : '#ff9800'} />
              <Cell label="Piyasa Değ."  value={fmtCap(metrics.marketCap)} />
              <Cell label="ND/EBITDA"    value={fmtNum(metrics.netDebtEbitda)} color={metrics.netDebtEbitda && metrics.netDebtEbitda > 4 ? '#ff4757' : undefined} />
              <Cell label="FCF"          value={fmtB(metrics.fcf)} />
              <Cell label="Analist Alış" value={metrics.analystBuyPct != null ? `%${metrics.analystBuyPct}` : 'N/A'} color={metrics.analystBuyPct >= 70 ? '#26de81' : undefined} />
            </div>
            {fibonacci && fibonacci.high > 0 && (
              <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded p-3">
                <div className="text-[10px] text-[#555570] uppercase mb-2">Fibonacci (2Y)</div>
                <div className="space-y-1">
                  {[
                    { l: '2Y Yüksek',   v: fibonacci.high,    c: '#ff4757' },
                    { l: 'Fib 23.6%',   v: fibonacci.lvl236,  c: '#d0d0e8' },
                    { l: 'Fib 38.2%',   v: fibonacci.lvl382,  c: '#d0d0e8' },
                    { l: 'Fib 61.8% ✦', v: fibonacci.lvl618,  c: '#4fc3f7' },
                    { l: '2Y Düşük',    v: fibonacci.low,     c: '#26de81' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-[#555]">{row.l}</span>
                      <span className="font-mono" style={{ color: row.c }}>${row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <RevBar data={revTrend} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3"><Skel h={75} /></div>
          <div className="col-span-2 space-y-2">{[1,2,3,4,5].map(i => <Skel key={i} h={10} />)}</div>
        </div>
      )}

      {/* ── Insider Report Panel (CEO promise vs. reality) ── */}
      <InsiderReportPanel
        symbol={symbol}
        locale={locale}
        autoOpen={autoOpenReport}
      />

      {/* ── Agent Tabs ── */}
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg overflow-hidden">
        <div className="flex border-b border-[#2a2a3e]">
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className="flex-1 px-3 py-3 text-xs font-medium transition relative"
              style={{ color: activeTab === i ? '#4fc3f7' : '#555570', background: activeTab === i ? '#4fc3f711' : 'transparent' }}>
              {tab.label}
              {tab.ready && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#26de81]" />}
              {activeTab === i && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4fc3f7]" />}
            </button>
          ))}
        </div>
        <div className="p-4">
          {TABS[activeTab].ready ? TABS[activeTab].content : (
            <div className="space-y-3"><Skel h={5} /><div className="grid grid-cols-2 gap-3"><Skel h={24} /><Skel h={24} /></div><Skel h={16} /></div>
          )}
        </div>
      </div>

    </div>
  );
}
