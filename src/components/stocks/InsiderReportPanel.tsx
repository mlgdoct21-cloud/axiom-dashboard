'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  symbol: string;
  locale: 'en' | 'tr';
  autoOpen?: boolean;
}

export const insiderReportRef = { trigger: (autoFetch?: boolean) => {} };

interface ReportResponse {
  symbol: string;
  mode: 'full' | 'teaser';
  locale: 'en' | 'tr';
  generatedAt: number;
  teaser: string | null;
  fullReport: string | null;
  recommendation: 'BUY' | 'HOLD' | 'CAUTION' | null;
  keyInsight: string | null;
  meta: {
    companyName: string;
    ceo?: string;
    currentPrice?: number;
    altmanZScore?: number;
    piotroskiScore?: number;
    targetUpsidePct?: number;
    insiderNetBuying?: boolean;
    beatRate?: number;
    hasTranscript?: boolean;
  };
}

// ─── Lightweight Markdown → JSX (headers, bold, hr, linebreaks) ──────────────
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
        </p>,
      );
    }
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushPara();
      continue;
    }

    if (/^---+$/.test(line)) {
      flushPara();
      out.push(<hr key={`hr-${i}`} className="border-[#2a2a3e] my-4" />);
      continue;
    }

    if (line.startsWith('## ')) {
      flushPara();
      out.push(
        <h3
          key={`h2-${i}`}
          className="text-base font-bold text-[#e0e0f0] mt-5 mb-2 flex items-center gap-2"
        >
          {renderInline(line.slice(3))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushPara();
      out.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-[#e0e0f0] mt-4 mb-3">
          {renderInline(line.slice(2))}
        </h2>,
      );
      continue;
    }

    if (line.startsWith('> ')) {
      flushPara();
      out.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-2 border-[#4fc3f7] pl-3 py-1 my-3 italic text-sm text-[#e0e0f0] bg-[#4fc3f7]/5"
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushPara();
      out.push(
        <li key={`li-${i}`} className="text-sm text-[#c0c0d0] ml-4 list-disc leading-relaxed">
          {renderInline(line.replace(/^[-*]\s+/, ''))}
        </li>,
      );
      continue;
    }

    para.push(line);
  }
  flushPara();

  return <div>{out}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Replace **bold**, *italic*, `code` → spans
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/;
  while (true) {
    const m = remaining.match(regex);
    if (!m) {
      parts.push(remaining);
      break;
    }
    const idx = m.index!;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    if (m[1]) parts.push(<strong key={key++} className="text-[#e0e0f0] font-semibold">{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={key++} className="text-[#ff9800]">{m[2]}</em>);
    else if (m[3]) parts.push(<code key={key++} className="bg-[#1a1a2e] px-1 rounded text-[#4fc3f7] text-xs">{m[3]}</code>);
    remaining = remaining.slice(idx + m[0].length);
  }
  return <>{parts}</>;
}

// ─── Main Panel (trigger card + modal popup) ─────────────────────────────────
export default function InsiderReportPanel({ symbol, autoOpen = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [open, setOpen] = useState(autoOpen);
  const [visible, setVisible] = useState(false);
  const controllerRef = useRef<any>({});

  // Rapor bu dashboard sayfasında HER ZAMAN Türkçe.
  const reportLocale: 'tr' = 'tr';

  const t = {
    title: 'İçeriden Rapor — CEO Vaadi vs. Gerçek',
    subtitle: 'CEO ne söylüyor? İçerdekiler buna inanıyor mu? Finansal veriler ne diyor?',
    generate: '🔍 İçeriden Rapor Oluştur',
    generating: 'Soruşturma yürütülüyor…',
    regenerate: 'Yeniden Oluştur',
    errLabel: 'Hata',
    keyInsight: 'ANA BULGU',
    insiderBuy: 'Net Alım',
    insiderSell: 'Net Satış',
    beatRate: 'Beat Rate',
    noTranscript: '⚠️ Son earnings call transcript bulunamadı — rapor sınırlı olabilir.',
    close: 'Kapat',
    verdict: 'Karar',
  };

  // Açılış animasyonu (mount → bir sonraki frame'de visible=true)
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // ESC ile kapat + body scroll kilidi
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 220);
  };

  const fetchReport = async (force = false) => {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const url = `/api/stock/analysis/insider-report?symbol=${encodeURIComponent(symbol)}&mode=full&locale=${reportLocale}${force ? '&force=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.reason || body.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ReportResponse;
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const recColor = (r?: string | null) =>
    r === 'BUY' ? '#26de81' : r === 'CAUTION' ? '#ff4757' : r === 'HOLD' ? '#ff9800' : '#666';

  // Telegram deeplink auto-trigger
  useEffect(() => {
    if (autoOpen && !data && !loading) {
      fetchReport(false);
    }
  }, [autoOpen]);

  // Ref expose (parent'ten erişim için)
  useEffect(() => {
    controllerRef.current = { fetchReport, closeModal };
  }, []);

  // ─── Sayfa içi tetikleyici kart ─────────────────────────────────────────────
  const trigger = (
    <div className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-1">
            AXIOM Insider Intelligence
          </div>
          <div className="text-sm font-bold text-[#e0e0f0]">{t.title}</div>
          <div className="text-xs text-[#888] mt-0.5">{t.subtitle}</div>
        </div>
        <button
          onClick={() => fetchReport(false)}
          className="shrink-0 px-4 py-2 rounded bg-[#4fc3f7]/10 border border-[#4fc3f7]/40 hover:bg-[#4fc3f7]/20 hover:scale-105 text-xs font-semibold text-[#4fc3f7] transition-all duration-200"
        >
          {data ? 'Raporu Yeniden Aç' : t.generate}
        </button>
      </div>
    </div>
  );

  // ─── Modal içeriği ──────────────────────────────────────────────────────────
  const modal = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        onClick={closeModal}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(12px)',
          boxShadow: visible ? '0 25px 80px -10px rgba(79,195,247,0.25)' : 'none',
        }}
      >
        {/* Modal header */}
        <div className="px-5 py-4 border-b border-[#2a2a3e] flex items-start justify-between gap-4 bg-gradient-to-r from-[#4fc3f7]/10 to-transparent">
          <div>
            <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-1">
              AXIOM Insider Intelligence · {symbol}
            </div>
            <div className="text-sm font-bold text-[#e0e0f0]">{t.title}</div>
            <div className="text-xs text-[#888] mt-0.5">{t.subtitle}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {data && !loading && (
              <button
                onClick={() => fetchReport(true)}
                className="px-3 py-1.5 rounded bg-[#4fc3f7]/10 border border-[#4fc3f7]/40 hover:bg-[#4fc3f7]/20 text-[11px] font-semibold text-[#4fc3f7] transition-colors"
              >
                {t.regenerate}
              </button>
            )}
            <button
              onClick={closeModal}
              className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#2a2a3e] hover:bg-[#2a2a3e] hover:text-[#ff4757] text-[#888] text-lg flex items-center justify-center transition-colors"
              aria-label={t.close}
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal body — scroll */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-5 py-16 flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4fc3f7] animate-bounce" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#4fc3f7] animate-bounce [animation-delay:0.15s]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#4fc3f7] animate-bounce [animation-delay:0.3s]" />
              </div>
              <div className="text-xs text-[#888]">{t.generating}</div>
              <div className="text-[10px] text-[#555]">
                FMP → transcript, insider trades, Z-Score → Gemini
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="px-5 py-4 bg-[#1a0d0d] border-b border-[#ff4757]/30">
              <div className="text-xs text-[#ff4757] font-semibold mb-1">⚠ {t.errLabel}</div>
              <div className="text-xs text-[#c0c0d0] break-words">{error}</div>
            </div>
          )}

          {data && !loading && (
            <div>
              {/* Insight bar */}
              <div className="px-5 py-4 border-b border-[#2a2a3e] bg-gradient-to-r from-[#4fc3f7]/10 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] text-[#4fc3f7] uppercase tracking-wider mb-1">
                      {t.keyInsight}
                    </div>
                    <div className="text-sm text-[#e0e0f0] leading-relaxed">
                      {data.keyInsight || '—'}
                    </div>
                  </div>
                  {data.recommendation && (
                    <div
                      className="shrink-0 px-4 py-2 rounded text-center"
                      style={{
                        background: recColor(data.recommendation) + '22',
                        border: `1px solid ${recColor(data.recommendation)}66`,
                      }}
                    >
                      <div className="text-[9px] text-[#888] uppercase mb-0.5">{t.verdict}</div>
                      <div
                        className="text-sm font-black"
                        style={{ color: recColor(data.recommendation) }}
                      >
                        {data.recommendation}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chips */}
              <div className="px-5 py-3 border-b border-[#2a2a3e] flex flex-wrap gap-2">
                {data.meta.altmanZScore != null && (
                  <Chip
                    label="Z-Score"
                    value={data.meta.altmanZScore.toFixed(2)}
                    color={
                      data.meta.altmanZScore > 3
                        ? '#26de81'
                        : data.meta.altmanZScore > 1.8
                        ? '#ff9800'
                        : '#ff4757'
                    }
                  />
                )}
                {data.meta.piotroskiScore != null && (
                  <Chip
                    label="Piotroski"
                    value={`${data.meta.piotroskiScore}/9`}
                    color={
                      data.meta.piotroskiScore >= 7
                        ? '#26de81'
                        : data.meta.piotroskiScore >= 4
                        ? '#ff9800'
                        : '#ff4757'
                    }
                  />
                )}
                {data.meta.targetUpsidePct != null && (
                  <Chip
                    label="Hedef"
                    value={`${data.meta.targetUpsidePct > 0 ? '+' : ''}${data.meta.targetUpsidePct.toFixed(1)}%`}
                    color={data.meta.targetUpsidePct > 0 ? '#26de81' : '#ff4757'}
                  />
                )}
                {data.meta.insiderNetBuying != null && (
                  <Chip
                    label="Insider"
                    value={data.meta.insiderNetBuying ? t.insiderBuy : t.insiderSell}
                    color={data.meta.insiderNetBuying ? '#26de81' : '#ff4757'}
                  />
                )}
                {data.meta.beatRate != null && (
                  <Chip
                    label={t.beatRate}
                    value={`${Math.round(data.meta.beatRate * 100)}%`}
                    color={
                      data.meta.beatRate >= 0.75
                        ? '#26de81'
                        : data.meta.beatRate >= 0.5
                        ? '#ff9800'
                        : '#ff4757'
                    }
                  />
                )}
              </div>

              <div className="px-5 py-4">
                {data.fullReport ? (
                  <RenderMarkdown text={data.fullReport} />
                ) : (
                  <div className="text-xs text-[#888] italic">Rapor içeriği boş döndü.</div>
                )}
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

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]"
      style={{ background: color + '15', border: `1px solid ${color}33` }}
    >
      <span className="text-[#888]">{label}:</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}
