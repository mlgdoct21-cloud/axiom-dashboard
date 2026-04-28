'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ReportData {
  symbol: string;
  projectName: string;
  recommendation: 'AL' | 'SAT' | 'BEKLE';
  confidenceScore: number;
  keyInsight: string;
  fullReport: string;
  chips: {
    devScore: number | null;
    fearGreed: number | null;
    fearLabel: string | null;
    dilution: number | null;
    price: number | null;
    marketCap: number | null;
  };
  generatedAt: number;
  cached: boolean;
}

function fmt(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

// ── Lightweight markdown renderer (copied from InsiderReportPanel pattern) ───
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const joined = para.join(' ').trim();
    if (joined) {
      out.push(
        <p key={`p-${out.length}`} className="text-sm text-[#c0c0d0] leading-relaxed mb-3">
          {renderInline(joined)}
        </p>
      );
    }
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flushPara(); continue; }
    if (/^---+$/.test(line)) { flushPara(); out.push(<hr key={`hr-${i}`} className="border-[#2a2a3e] my-4" />); continue; }
    if (line.startsWith('## ')) {
      flushPara();
      out.push(<h3 key={`h2-${i}`} className="text-base font-bold text-[#4fc3f7] mt-5 mb-2">{renderInline(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith('# ')) {
      flushPara();
      out.push(<h2 key={`h1-${i}`} className="text-lg font-bold text-[#e0e0f0] mt-4 mb-3">{renderInline(line.slice(2))}</h2>);
      continue;
    }
    if (line.startsWith('> ')) {
      flushPara();
      out.push(<blockquote key={`bq-${i}`} className="border-l-2 border-[#4fc3f7] pl-3 py-1 my-3 italic text-sm text-[#e0e0f0] bg-[#4fc3f7]/5">{renderInline(line.slice(2))}</blockquote>);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      out.push(<li key={`li-${i}`} className="text-sm text-[#c0c0d0] ml-4 list-disc leading-relaxed mb-1">{renderInline(line.replace(/^[-*]\s+/, ''))}</li>);
      continue;
    }
    para.push(line);
  }
  flushPara();
  return <div>{out}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/;
  while (true) {
    const m = remaining.match(regex);
    if (!m) { parts.push(remaining); break; }
    if (m.index! > 0) parts.push(remaining.slice(0, m.index!));
    if (m[1]) parts.push(<strong key={key++} className="text-[#e0e0f0] font-semibold">{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={key++} className="text-[#ff9800]">{m[2]}</em>);
    else if (m[3]) parts.push(<code key={key++} className="bg-[#1a1a2e] px-1 rounded text-[#4fc3f7] text-xs">{m[3]}</code>);
    remaining = remaining.slice(m.index! + m[0].length);
  }
  return <>{parts}</>;
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
      style={{ background: color + '18', border: `1px solid ${color}40` }}>
      <span className="text-[#888]">{label}:</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CryptoReportPanel({ symbol }: { symbol: string }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [data, setData]         = useState<ReportData | null>(null);
  const [open, setOpen]         = useState(false);
  const [visible, setVisible]   = useState(false);

  // Reset data when symbol changes
  useEffect(() => { setData(null); setError(null); }, [symbol]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const closeModal = () => { setVisible(false); setTimeout(() => setOpen(false), 220); };

  const fetchReport = async (force = false) => {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch(`/api/crypto/report?symbol=${symbol}${force ? '&force=1' : ''}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const recColor = (r?: string) =>
    r === 'AL' ? '#26de81' : r === 'SAT' ? '#ff4757' : '#ff9800';

  const fearColor = (v: number) =>
    v <= 25 ? '#ff4757' : v <= 45 ? '#ff9800' : v <= 55 ? '#aaa' : v <= 75 ? '#26de81' : '#00d2ff';

  // ── Trigger card ────────────────────────────────────────────────────────────
  const trigger = (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-1">
            AXIOM Kripto İstihbaratı · {symbol}
          </div>
          <div className="text-sm font-bold text-[#e0e0f0]">
            6-Perde Kripto Analiz Raporu
          </div>
          <div className="text-xs text-[#888] mt-0.5">
            Smart money · Developer sağlığı · Tokenomics · Whitepaper gerçeklik testi
          </div>
        </div>
        <button
          onClick={() => data ? setOpen(true) : fetchReport(false)}
          className="shrink-0 px-4 py-2 rounded bg-[#4fc3f7]/10 border border-[#4fc3f7]/40 hover:bg-[#4fc3f7]/20 hover:scale-105 text-xs font-semibold text-[#4fc3f7] transition-all duration-200"
        >
          {data ? '📋 Raporu Aç' : '🔍 Rapor Üret'}
        </button>
      </div>
    </div>
  );

  // ── Modal ───────────────────────────────────────────────────────────────────
  const modal = open ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div onClick={closeModal}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(12px)',
          boxShadow: visible ? '0 25px 80px -10px rgba(79,195,247,0.25)' : 'none',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2a2a3e] flex items-start justify-between gap-4 bg-gradient-to-r from-[#4fc3f7]/10 to-transparent">
          <div>
            <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-1">
              AXIOM Kripto İstihbaratı · {symbol} {data?.projectName && `· ${data.projectName}`}
            </div>
            <div className="text-sm font-bold text-[#e0e0f0]">6-Perde Kripto Analiz Raporu</div>
            <div className="text-xs text-[#888] mt-0.5">GitHub · CoinGecko · Fear&Greed · Gemini 2.5 Flash</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data && !loading && (
              <button onClick={() => fetchReport(true)}
                className="px-3 py-1.5 rounded bg-[#4fc3f7]/10 border border-[#4fc3f7]/40 hover:bg-[#4fc3f7]/20 text-[11px] font-semibold text-[#4fc3f7] transition-colors">
                Yenile
              </button>
            )}
            <button onClick={closeModal}
              className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#2a2a3e] hover:bg-[#2a2a3e] hover:text-[#ff4757] text-[#888] text-lg flex items-center justify-center transition-colors">
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="px-5 py-16 flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#4fc3f7] animate-bounce"
                    style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
              <div className="text-xs text-[#888]">6-perde rapor hazırlanıyor…</div>
              <div className="text-[10px] text-[#555]">GitHub · CoinGecko · Fear&Greed → Gemini</div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="px-5 py-4 bg-[#1a0d0d] border-b border-[#ff4757]/30">
              <div className="text-xs text-[#ff4757] font-semibold mb-1">⚠ Hata</div>
              <div className="text-xs text-[#c0c0d0]">{error}</div>
            </div>
          )}

          {/* Report */}
          {data && !loading && (
            <div>
              {/* Key insight + verdict */}
              <div className="px-5 py-4 border-b border-[#2a2a3e] bg-gradient-to-r from-[#4fc3f7]/10 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-1">ANA BULGU</div>
                    <div className="text-sm text-[#e0e0f0] leading-relaxed">{data.keyInsight}</div>
                  </div>
                  <div className="shrink-0 px-4 py-2 rounded text-center"
                    style={{ background: recColor(data.recommendation) + '22', border: `1px solid ${recColor(data.recommendation)}66` }}>
                    <div className="text-[9px] text-[#888] uppercase mb-0.5">Karar</div>
                    <div className="text-sm font-black" style={{ color: recColor(data.recommendation) }}>
                      {data.recommendation}
                    </div>
                    <div className="text-[10px] text-[#888] mt-0.5">{data.confidenceScore}/10</div>
                  </div>
                </div>
              </div>

              {/* Chips */}
              <div className="px-5 py-3 border-b border-[#2a2a3e] flex flex-wrap gap-2">
                {data.chips.devScore != null && (
                  <Chip label="Dev Sağlığı" value={`${data.chips.devScore}/100`}
                    color={data.chips.devScore >= 70 ? '#26de81' : data.chips.devScore >= 45 ? '#ff9800' : '#ff4757'} />
                )}
                {data.chips.fearGreed != null && (
                  <Chip label="Korku/Açgözlülük" value={`${data.chips.fearGreed} — ${data.chips.fearLabel}`}
                    color={fearColor(data.chips.fearGreed)} />
                )}
                {data.chips.dilution != null && (
                  <Chip label="Dilüsyon Riski" value={`%${data.chips.dilution.toFixed(1)}`}
                    color={data.chips.dilution > 30 ? '#ff4757' : data.chips.dilution > 15 ? '#ff9800' : '#26de81'} />
                )}
                {data.chips.price != null && (
                  <Chip label="Fiyat" value={`$${data.chips.price.toLocaleString()}`} color="#4fc3f7" />
                )}
                {data.chips.marketCap != null && (
                  <Chip label="Piyasa Değeri" value={`$${fmt(data.chips.marketCap)}`} color="#888" />
                )}
                {data.cached && (
                  <Chip label="Kaynak" value="önbellek" color="#555" />
                )}
              </div>

              {/* Full 6-perde narrative */}
              <div className="px-5 py-4">
                <RenderMarkdown text={data.fullReport} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {trigger}
      {typeof window !== 'undefined' && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
