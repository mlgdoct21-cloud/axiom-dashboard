'use client';

import { useEffect, useState } from 'react';
import OnChainIntelCard from './OnChainIntelCard';
import AlertHistoryCard from './AlertHistoryCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverviewData {
  symbol: string;
  name: string;
  price: {
    current: number; change24h: number; change7d: number;
    marketCap: number; marketCapRank: number; volume24h: number;
    ath: number; athChangePct: number;
  };
  supply: {
    circulating: number; total: number | null; max: number | null;
    circulatingPct: number; lockedPct: number;
  };
  verdict: 'AL' | 'SAT' | 'BEKLE';
  confidence: number;
  keyInsight: string;
  tokenomics: {
    simple_explanation: string;
    dilution_risk: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK';
    dilution_explanation: string;
    supply_note: string;
  };
  whitepaper: {
    purpose: string;
    problem_solved: string;
    how_it_works: string;
    token_role: string;
    vs_competitors: string;
    key_risks: string[];
  };
  roadmap: {
    summary: string;
    milestones: Array<{
      period: string;
      title: string;
      description: string;
      status: 'TAMAMLANDI' | 'DEVAM_EDIYOR' | 'PLANLANMIYOR' | 'GELECEK';
      impact: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK';
    }>;
    next_major: string;
  };
  whales: {
    summary: string;
    signal: 'ALIYOR' | 'SATIYOR' | 'NOTR' | 'BILINMIYOR';
    labeled_holders: Array<{
      address: string; label: string;
      type: 'BORSA' | 'VC_FONU' | 'KURUM' | 'VAKIF' | 'EKIP' | 'BILINMIYOR';
      share_pct: number | null;
      note: string;
    }>;
    unlock_risk: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK';
    unlock_summary: string;
  };
  onChainHolders: Array<{
    address: string; share: number;
    label: string | null; type: string; note: string | null;
  }>;
  generatedAt: number;
  cached: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString('tr-TR');
}

function fmtPrice(n: number) {
  if (n >= 1000) return '$' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  if (n >= 1)    return '$' + n.toFixed(4);
  return '$' + n.toFixed(6);
}

const C = {
  green:  '#26de81',
  red:    '#ff4757',
  orange: '#ff9800',
  blue:   '#4fc3f7',
  purple: '#a78bfa',
  yellow: '#fbbf24',
  gray:   '#888',
};

const riskColor = {
  'DÜŞÜK':  { text: C.green,  bg: C.green  + '15', border: C.green  + '40' },
  'ORTA':   { text: C.orange, bg: C.orange + '15', border: C.orange + '40' },
  'YÜKSEK': { text: C.red,    bg: C.red    + '15', border: C.red    + '40' },
};

const verdictMeta = {
  AL:    { bg: C.green  + '18', border: C.green  + '55', text: C.green,  icon: '📈' },
  SAT:   { bg: C.red    + '18', border: C.red    + '55', text: C.red,    icon: '📉' },
  BEKLE: { bg: C.orange + '18', border: C.orange + '55', text: C.orange, icon: '⏳' },
};

const milestoneStatus = {
  TAMAMLANDI:   { color: C.green,  dot: 'bg-[#26de81]',  label: 'Tamamlandı' },
  DEVAM_EDIYOR: { color: C.blue,   dot: 'bg-[#4fc3f7] animate-pulse', label: 'Devam Ediyor' },
  PLANLANMIYOR: { color: C.gray,   dot: 'bg-[#555]',     label: 'İptal/Değişti' },
  GELECEK:      { color: C.yellow, dot: 'bg-[#fbbf24]',  label: 'Planlanıyor' },
};

const holderTypeMeta: Record<string, { icon: string; color: string; label: string }> = {
  BORSA:        { icon: '🏦', color: C.blue,   label: 'Borsa' },
  VC_FONU:      { icon: '💼', color: C.purple, label: 'VC Fonu' },
  KURUM:        { icon: '🏢', color: C.green,  label: 'Kurum' },
  VAKIF:        { icon: '🏛️', color: C.yellow, label: 'Vakıf' },
  EKIP:         { icon: '👨‍💻', color: C.orange, label: 'Ekip' },
  BILINMIYOR:   { icon: '❓', color: C.gray,   label: 'Bilinmiyor' },
};

const signalMeta = {
  ALIYOR:     { icon: '📈', text: 'Akıllı para ALIYOR',  color: C.green },
  SATIYOR:    { icon: '📉', text: 'Akıllı para SATIYOR', color: C.red },
  NOTR:       { icon: '➡️', text: 'Nötr / Bekliyor',    color: C.gray },
  BILINMIYOR: { icon: '❓', text: 'Sinyal Yok',          color: '#555' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true, badge }: {
  title: string; icon: string; children: React.ReactNode;
  defaultOpen?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-[#e0e0f0]">{title}</span>
          {badge}
        </div>
        <span className={`text-[#444] text-xs transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function InfoCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-3">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-bold truncate" style={{ color: color ?? '#e0e0f0' }}>{value}</div>
      {sub && <div className="text-[10px] text-[#555] mt-0.5">{sub}</div>}
    </div>
  );
}

function RiskBadge({ risk }: { risk: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' }) {
  const r = riskColor[risk];
  return (
    <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: r.bg, color: r.text, border: `1px solid ${r.border}` }}>
      {risk}
    </span>
  );
}

// SVG Donut
function SupplyDonut({ pct }: { pct: number }) {
  const r = 38; const cx = 50; const cy = 50;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a2e" strokeWidth="14" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ff980025" strokeWidth="14" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.blue}
        strokeWidth="14" strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#e0e0f0" fontSize="13" fontWeight="bold">{pct}%</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#555" fontSize="8">Dolaşımda</text>
    </svg>
  );
}

// ── Roadmap Timeline ──────────────────────────────────────────────────────────

function RoadmapTimeline({ milestones, next_major }: OverviewData['roadmap']) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? milestones : milestones.slice(0, 6);

  return (
    <div>
      <div className="relative">
        {/* vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-[#1e1e38]" />

        <div className="space-y-1">
          {visible.map((m, i) => {
            const sm = milestoneStatus[m.status] ?? milestoneStatus.GELECEK;
            const impactW = m.impact === 'YÜKSEK' ? 'font-bold' : m.impact === 'ORTA' ? 'font-semibold' : 'font-normal';
            return (
              <div key={i} className="flex gap-3 items-start pl-1">
                {/* dot */}
                <div className="relative z-10 shrink-0 mt-2">
                  <div className={`w-[10px] h-[10px] rounded-full ${sm.dot} ring-2 ring-[#0d0d1a]`} />
                </div>

                <div className="flex-1 min-w-0 pb-4 border-b border-[#1a1a28] last:border-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-[#555] shrink-0">{m.period}</span>
                        <span className={`text-sm text-[#e0e0f0] ${impactW}`}>{m.title}</span>
                      </div>
                      <p className="text-xs text-[#888] mt-0.5 leading-relaxed">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {m.impact === 'YÜKSEK' && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#fbbf2415] text-[#fbbf24] border border-[#fbbf2430]">
                          ÖNEMLİ
                        </span>
                      )}
                      <span className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ color: sm.color, background: sm.color + '18', border: `1px solid ${sm.color}35` }}>
                        {sm.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {milestones.length > 6 && (
        <button onClick={() => setShowAll(o => !o)}
          className="mt-3 text-xs text-[#4fc3f7] hover:underline">
          {showAll ? '▲ Daha az göster' : `▼ ${milestones.length - 6} milestone daha göster`}
        </button>
      )}

      {next_major && (
        <div className="mt-4 bg-[#fbbf2408] border border-[#fbbf2430] rounded-lg p-3">
          <div className="text-[9px] uppercase tracking-wider text-[#fbbf24] mb-1">Sonraki Büyük Gelişme</div>
          <p className="text-xs text-[#c0c0d0] leading-relaxed">{next_major}</p>
        </div>
      )}
    </div>
  );
}

// ── Whale Table ───────────────────────────────────────────────────────────────

function WhaleTable({ data }: { data: OverviewData }) {
  // Merge on-chain (real) + Gemini labeled holders
  // Priority: on-chain real data if available, else Gemini list
  const hasOnChain = data.onChainHolders?.length > 0;

  const rows = hasOnChain
    ? data.onChainHolders.slice(0, 12).map(h => ({
        address: h.address,
        label:   h.label ?? data.whales.labeled_holders.find(
          g => g.address?.toLowerCase() === h.address?.toLowerCase()
        )?.label ?? 'Bilinmiyor',
        type:     h.type as any,
        share:    h.share,
        note:     h.note ?? data.whales.labeled_holders.find(
          g => g.address?.toLowerCase() === h.address?.toLowerCase()
        )?.note ?? null,
        isReal: true,
      }))
    : data.whales.labeled_holders.slice(0, 10).map(h => ({
        address: h.address,
        label:   h.label,
        type:    h.type,
        share:   h.share_pct ?? null,
        note:    h.note,
        isReal: false,
      }));

  return (
    <div>
      {hasOnChain && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded bg-[#26de8115] text-[#26de81] border border-[#26de8135]">
            ✓ Gerçek On-Chain Veri
          </span>
          <span className="text-[9px] text-[#444]">Ethplorer'dan çekildi</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#555] uppercase text-[9px] tracking-wider border-b border-[#1e1e38]">
              <th className="text-left pb-2 pr-3">#</th>
              <th className="text-left pb-2 pr-3">Cüzdan / Kurum</th>
              <th className="text-left pb-2 pr-3">Tür</th>
              <th className="text-right pb-2 pr-3">Arz %</th>
              <th className="text-left pb-2">Açıklama</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a28]">
            {rows.map((r, i) => {
              const hm = holderTypeMeta[r.type] ?? holderTypeMeta.BILINMIYOR;
              return (
                <tr key={i} className="hover:bg-white/[0.02] transition">
                  <td className="py-2.5 pr-3 text-[#444] font-mono">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold text-[#e0e0f0]">{r.label}</div>
                    {hasOnChain && (
                      <div className="font-mono text-[9px] text-[#444] mt-0.5">
                        {r.address.slice(0, 6)}...{r.address.slice(-4)}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-1 whitespace-nowrap"
                      style={{ color: hm.color }}>
                      <span>{hm.icon}</span>
                      <span className="text-[10px]">{hm.label}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono font-bold"
                    style={{ color: r.share !== null && r.share > 5 ? C.orange : '#e0e0f0' }}>
                    {r.share !== null ? `%${r.share}` : '—'}
                  </td>
                  <td className="py-2.5 text-[#777] leading-relaxed max-w-[220px]">
                    {r.note ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-6 space-y-4">
        <div className="flex justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-7 w-48 bg-[#1a1a2e] rounded" />
            <div className="h-5 w-36 bg-[#1a1a2e] rounded" />
          </div>
          <div className="h-16 w-20 bg-[#1a1a2e] rounded-xl" />
        </div>
        <div className="h-12 bg-[#1a1a2e] rounded-lg" />
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-12 bg-[#1a1a2e] rounded-lg" />)}
        </div>
      </div>
      {[1,2,3,4].map(i => <div key={i} className="h-14 bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl" />)}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CryptoDashboard({ symbol }: { symbol: string }) {
  const [data, setData]       = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  // Whitepaper full modal
  const [wpOpen, setWpOpen]       = useState(false);
  const [wpLoading, setWpLoading] = useState(false);
  const [wpContent, setWpContent] = useState<string | null>(null);
  const [wpError, setWpError]     = useState<string | null>(null);

  async function loadFullWhitepaper() {
    if (wpContent) { setWpOpen(true); return; }
    setWpOpen(true);
    setWpLoading(true);
    setWpError(null);
    try {
      const res  = await fetch(`/api/crypto/whitepaper-full?symbol=${symbol}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setWpContent(json.content);
    } catch (e: any) {
      setWpError(e?.message ?? 'Whitepaper verisi alınamadı');
    } finally {
      setWpLoading(false);
    }
  }

  // Symbol değişince whitepaper state'i sıfırla
  useEffect(() => { setWpContent(null); setWpError(null); }, [symbol]);

  useEffect(() => { setData(null); setError(null); setFetched(false); }, [symbol]);

  const load = async (force = false) => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/crypto/overview?symbol=${symbol}${force ? '&force=1' : ''}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setFetched(true);
    } catch (e: any) {
      setError(e?.message ?? 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  if (!fetched && !loading) {
    return (
      <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl p-10 flex flex-col items-center gap-4">
        <div className="text-4xl">🔬</div>
        <div className="text-center">
          <div className="text-base font-bold text-[#e0e0f0] mb-1">{symbol} Derin Analiz</div>
          <div className="text-xs text-[#555] max-w-xs">
            Whitepaper özeti · Ay-ay roadmap · Gerçek on-chain balina takibi · Tokenomics
          </div>
        </div>
        <button onClick={() => load(false)}
          className="px-6 py-2.5 rounded-lg bg-[#4fc3f7]/10 border border-[#4fc3f7]/40 hover:bg-[#4fc3f7]/20 text-sm font-semibold text-[#4fc3f7] transition-all hover:scale-105">
          Analizi Başlat
        </button>
        <p className="text-[10px] text-[#333]">İlk yükleme ~10 saniye sürebilir</p>
      </div>
    );
  }

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="bg-[#1a0d0d] border border-[#ff4757]/30 rounded-xl p-6 text-center">
        <div className="text-2xl mb-2">⚠️</div>
        <div className="text-sm font-semibold text-[#ff4757] mb-1">Yüklenemedi</div>
        <div className="text-xs text-[#c0c0d0] mb-4">{error}</div>
        <button onClick={() => load(false)}
          className="px-4 py-1.5 rounded bg-[#ff4757]/10 border border-[#ff4757]/30 text-xs text-[#ff4757] hover:bg-[#ff4757]/20 transition">
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!data) return null;

  const vm = verdictMeta[data.verdict] ?? verdictMeta.BEKLE;
  const sm = signalMeta[data.whales?.signal ?? 'BILINMIYOR'];

  return (
    <div className="space-y-4">

      {/* ═══════════════════ HERO ═══════════════════ */}
      <div className="bg-gradient-to-br from-[#0d0d1a] to-[#111125] border border-[#2a2a3e] rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#e0e0f0]">{data.name}</h1>
              <span className="text-xs text-[#555] font-mono">{data.symbol}</span>
              {data.price.marketCapRank > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#4fc3f7]/10 text-[#4fc3f7] border border-[#4fc3f7]/20">
                  #{data.price.marketCapRank}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <span className="text-2xl font-bold text-[#e0e0f0]">{fmtPrice(data.price.current)}</span>
              <span className="text-sm font-semibold"
                style={{ color: data.price.change24h >= 0 ? C.green : C.red }}>
                {data.price.change24h >= 0 ? '▲' : '▼'} {Math.abs(data.price.change24h).toFixed(2)}%
              </span>
              <span className="text-xs text-[#444]">24s</span>
            </div>
          </div>
          {/* Verdict */}
          <div className="px-4 py-3 rounded-xl text-center shrink-0"
            style={{ background: vm.bg, border: `1px solid ${vm.border}` }}>
            <div className="text-xl">{vm.icon}</div>
            <div className="text-2xl font-black mt-0.5" style={{ color: vm.text }}>{data.verdict}</div>
            <div className="text-[9px] text-[#555] mt-0.5">güven {data.confidence}/10</div>
          </div>
        </div>

        {/* Key insight */}
        <div className="mt-4 bg-[#4fc3f7]/5 border-l-2 border-[#4fc3f7] rounded-r-lg px-3 py-2.5">
          <div className="text-[9px] uppercase tracking-widest text-[#4fc3f7] mb-1">Ana Bulgu</div>
          <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.keyInsight}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <InfoCard label="Piyasa Değeri"  value={`$${fmtNum(data.price.marketCap)}`} />
          <InfoCard label="24s Hacim"       value={`$${fmtNum(data.price.volume24h)}`} />
          <InfoCard label="7g Değişim"
            value={`${data.price.change7d >= 0 ? '+' : ''}${data.price.change7d.toFixed(2)}%`}
            color={data.price.change7d >= 0 ? C.green : C.red} />
          <InfoCard label="ATH'den Uzaklık"
            value={`%${Math.abs(data.price.athChangePct ?? 0).toFixed(0)}`}
            sub={`ATH: ${fmtPrice(data.price.ath)}`}
            color={C.orange} />
        </div>

        <div className="mt-3 flex items-center gap-3 text-[10px] text-[#444]">
          {data.cached && <span className="px-1.5 py-0.5 rounded bg-[#2a2a3e]">önbellekten</span>}
          <span>{new Date(data.generatedAt).toLocaleString('tr-TR')}</span>
          <button onClick={() => load(true)} className="ml-auto text-[#555] hover:text-[#4fc3f7] transition">
            ↺ Yenile
          </button>
        </div>
      </div>

      {/* ═══════════════════ TOKENOMİCS ═══════════════════ */}
      <Section icon="🪙" title="Tokenomik — Arz Yapısı"
        badge={<RiskBadge risk={data.tokenomics.dilution_risk} />}>
        <div className="flex flex-col sm:flex-row gap-5 mt-3">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <SupplyDonut pct={data.supply.circulatingPct} />
            <div className="flex gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.blue }} />
                <span className="text-[#777]">Dolaşımda</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-[#1a1a2e] border border-orange-500/40" />
                <span className="text-[#777]">Kilitli</span>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.tokenomics.simple_explanation}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <InfoCard label="Dolaşımdaki Arz" value={fmtNum(data.supply.circulating)} />
              <InfoCard label="Toplam Arz" value={data.supply.total ? fmtNum(data.supply.total) : 'Sınırsız'} />
              {data.supply.max && <InfoCard label="Maksimum Arz" value={fmtNum(data.supply.max)} />}
            </div>
            <div className="rounded-lg p-3" style={{
              background: riskColor[data.tokenomics.dilution_risk].bg,
              border: `1px solid ${riskColor[data.tokenomics.dilution_risk].border}`
            }}>
              <div className="text-[10px] uppercase tracking-wider font-semibold mb-1"
                style={{ color: riskColor[data.tokenomics.dilution_risk].text }}>
                Dilüsyon Riski — {data.tokenomics.dilution_risk}
              </div>
              <p className="text-xs text-[#c0c0d0] leading-relaxed">{data.tokenomics.dilution_explanation}</p>
            </div>
            {data.tokenomics.supply_note && (
              <p className="text-xs text-[#666] italic">{data.tokenomics.supply_note}</p>
            )}
          </div>
        </div>
      </Section>

      {/* ═══════════════════ WHITEPAPER ═══════════════════ */}
      <Section icon="📄" title="Whitepaper Özeti">
        <div className="space-y-4 mt-3">
          {/* Purpose & Problem */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-[#4fc3f7] mb-2">Neden Yaratıldı?</div>
              <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.whitepaper.purpose}</p>
            </div>
            <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-[#4fc3f7] mb-2">Hangi Problemi Çözüyor?</div>
              <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.whitepaper.problem_solved}</p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-wider text-[#4fc3f7] mb-2">Nasıl Çalışıyor?</div>
            <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.whitepaper.how_it_works}</p>
          </div>

          {/* Token role + vs competitors */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-[#a78bfa] mb-2">Tokenin Rolü</div>
              <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.whitepaper.token_role}</p>
            </div>
            <div className="bg-[#111125] border border-[#2a2a3e] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-[#26de81] mb-2">Rakiplerden Farkı</div>
              <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.whitepaper.vs_competitors}</p>
            </div>
          </div>

          {/* Key risks */}
          {data.whitepaper.key_risks?.length > 0 && (
            <div className="bg-[#ff475708] border border-[#ff475730] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-[#ff4757] mb-2">Önemli Riskler</div>
              <ul className="space-y-1.5">
                {data.whitepaper.key_risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#c0c0d0]">
                    <span className="text-[#ff4757] shrink-0">⚠</span>
                    <span className="leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full whitepaper button */}
          <div className="pt-1 flex justify-end">
            <button
              onClick={loadFullWhitepaper}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold
                bg-[#4fc3f7]/8 border border-[#4fc3f7]/30 text-[#4fc3f7]
                hover:bg-[#4fc3f7]/15 hover:border-[#4fc3f7]/60 transition-all"
            >
              📄 Tamamını Türkçe Oku
            </button>
          </div>
        </div>
      </Section>

      {/* ═══════════════════ ROADMAP ═══════════════════ */}
      <Section icon="🗺️" title="Yol Haritası — Ay-Ay Gelişim">
        <div className="mt-3 space-y-3">
          <p className="text-sm text-[#c0c0d0] leading-relaxed border-b border-[#1e1e38] pb-3">
            {data.roadmap.summary}
          </p>
          <div className="flex gap-4 text-[10px] text-[#555] pb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#26de81]" /> Tamamlandı
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4fc3f7] animate-pulse" /> Devam Ediyor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#fbbf24]" /> Planlanıyor
            </span>
          </div>
          <RoadmapTimeline {...data.roadmap} />
        </div>
      </Section>

      {/* ═══════════════════ WHITEPAPER MODAL ═══════════════════ */}
      {wpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16
            bg-black/70 backdrop-blur-sm"
          onClick={() => setWpOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] flex flex-col
              bg-[#0d0d1a] border border-[#2a2a3e] rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e38] shrink-0">
              <div>
                <div className="text-sm font-bold text-[#e0e0f0]">
                  📄 {data.name} — Whitepaper Türkçe
                </div>
                <div className="text-[10px] text-[#444] mt-0.5">
                  Orijinal whitepaper Gemini tarafından Türkçeye çevrildi
                </div>
              </div>
              <button
                onClick={() => setWpOpen(false)}
                className="text-[#555] hover:text-[#e0e0f0] text-xl transition leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {wpLoading && (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <svg className="w-8 h-8 text-[#4fc3f7] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <div className="text-sm text-[#666]">
                    Whitepaper çevriliyor<br />
                    <span className="text-xs text-[#444]">~10-15 saniye sürebilir</span>
                  </div>
                </div>
              )}

              {wpError && !wpLoading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="text-2xl">⚠️</div>
                  <div className="text-sm text-[#ff4757]">{wpError}</div>
                  <button
                    onClick={() => { setWpContent(null); loadFullWhitepaper(); }}
                    className="px-3 py-1.5 rounded text-xs bg-[#ff4757]/10 border border-[#ff4757]/30
                      text-[#ff4757] hover:bg-[#ff4757]/20 transition"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {wpContent && !wpLoading && (
                <div className="prose prose-sm prose-invert max-w-none">
                  {wpContent.split('\n').map((line, i) => {
                    if (!line.trim()) return <div key={i} className="h-2" />;
                    if (line.startsWith('## ') || line.startsWith('# ')) {
                      return (
                        <h3 key={i} className="text-sm font-bold text-[#4fc3f7] mt-5 mb-2 pb-1
                          border-b border-[#1e1e38]">
                          {line.replace(/^#{1,3}\s+/, '')}
                        </h3>
                      );
                    }
                    if (line.startsWith('⚡')) {
                      return (
                        <p key={i} className="text-sm text-[#fbbf24] leading-relaxed my-1.5 pl-2
                          border-l-2 border-[#fbbf24]/40">
                          {line}
                        </p>
                      );
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return (
                        <p key={i} className="text-sm text-[#c0c0d0] leading-relaxed my-1 pl-3
                          before:content-['•'] before:text-[#4fc3f7] before:mr-2">
                          {line.replace(/^[-*]\s+/, '')}
                        </p>
                      );
                    }
                    return (
                      <p key={i} className="text-sm text-[#c0c0d0] leading-relaxed my-1.5">
                        {line}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ BALINALAR ═══════════════════ */}
      {/* ═══════════════════ ON-CHAIN INTEL (CryptoQuant) ═══════════════════ */}
      <Section icon="🔗" title="On-Chain Sinyaller — Akıllı Para Akışı" defaultOpen={true}>
        <div className="space-y-3">
          <OnChainIntelCard symbol={data.symbol} />
          {data.symbol === 'BTC' && <AlertHistoryCard />}
        </div>
      </Section>

      <Section icon="🐋" title="Balina Takibi — Büyük Oyuncular"
        badge={
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
            style={{ color: sm.color, background: sm.color + '18', border: `1px solid ${sm.color}40` }}>
            {sm.icon} {sm.text}
          </span>
        }>
        <div className="space-y-4 mt-3">
          <p className="text-sm text-[#c0c0d0] leading-relaxed">{data.whales.summary}</p>
          <WhaleTable data={data} />

          {/* Unlock risk */}
          <div className="rounded-lg p-3" style={{
            background: riskColor[data.whales.unlock_risk].bg,
            border: `1px solid ${riskColor[data.whales.unlock_risk].border}`
          }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: riskColor[data.whales.unlock_risk].text }}>
                Kilit Açılım Riski
              </div>
              <RiskBadge risk={data.whales.unlock_risk} />
            </div>
            <p className="text-xs text-[#c0c0d0] leading-relaxed">{data.whales.unlock_summary}</p>
          </div>

          <p className="text-[9px] text-[#333] italic">
            {data.onChainHolders?.length > 0
              ? `* ${data.symbol} için gerçek on-chain verisi Ethplorer üzerinden çekildi. Anlık güncel bilgi.`
              : `* ${data.symbol} için on-chain holder verisi bu versiyonda mevcut değil. Veriler Gemini'nin bilgisine dayanmaktadır.`}
          </p>
        </div>
      </Section>

    </div>
  );
}
