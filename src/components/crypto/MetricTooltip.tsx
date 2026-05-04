'use client';

import { useState, useRef, useEffect } from 'react';
import { getMetricInfo, MetricInfo } from '@/lib/onchain-glossary';

interface MetricTooltipProps {
  metricKey: string;
  /** Optional current value to highlight in the modal */
  currentValue?: string;
  /** Optional current zone label (matches a how_to_read entry) */
  currentZone?: string;
}

/**
 * Renders an "ⓘ" icon next to a metric label. Hover/tap shows a small balloon
 * with full name + 1-line teaser + "Detay" link. Detay opens a fullscreen
 * modal with what-is / how-to-read bands / why-matters.
 *
 * Mobile-friendly: tap to toggle, tap outside to close.
 */
export default function MetricTooltip({ metricKey, currentValue, currentZone }: MetricTooltipProps) {
  const info = getMetricInfo(metricKey);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Close tooltip on outside click (mobile-friendly)
  useEffect(() => {
    if (!tooltipOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tooltipOpen]);

  if (!info) return null;

  return (
    <>
      <span ref={wrapperRef} className="relative inline-flex items-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setTooltipOpen(o => !o); }}
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-[#2a2a3e] hover:bg-[#4fc3f7]/30 text-[10px] text-[#888] hover:text-[#4fc3f7] transition cursor-help"
          aria-label={`${info.full_tr} hakkında bilgi`}
        >
          ⓘ
        </button>

        {tooltipOpen && (
          <div
            className="absolute left-0 top-6 z-50 w-72 bg-[#0d0d1a] border border-[#2a2a3e] rounded-lg shadow-2xl p-3 text-left"
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
          >
            <div className="text-[11px] font-bold text-[#e0e0f0] leading-tight">{info.full_tr}</div>
            <div className="text-[9px] text-[#666] leading-tight mb-2">{info.full_en}</div>
            <div className="text-[10px] text-[#c0c0d0] leading-snug mb-2">{info.what_is.slice(0, 140)}{info.what_is.length > 140 ? '…' : ''}</div>
            {currentValue && currentZone && (
              <div className="text-[10px] text-[#4fc3f7] mb-2">
                Şu an: <span className="font-mono font-bold">{currentValue}</span> → {currentZone}
              </div>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setTooltipOpen(false); setModalOpen(true); }}
              className="text-[10px] text-[#4fc3f7] hover:text-[#26de81] transition font-semibold"
            >
              📖 Detay aç →
            </button>
          </div>
        )}
      </span>

      {modalOpen && (
        <DetailModal
          info={info}
          currentValue={currentValue}
          currentZone={currentZone}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function DetailModal({
  info, currentValue, currentZone, onClose,
}: { info: MetricInfo; currentValue?: string; currentZone?: string; onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0d0d1a] border-b border-[#2a2a3e] px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold text-[#e0e0f0]">{info.full_tr}</div>
            <div className="text-[11px] text-[#666]">{info.full_en} · {info.short}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#1a1a2e] hover:bg-[#ff4757]/20 text-[#888] hover:text-[#ff4757] flex items-center justify-center transition"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          <Section icon="📖" title="NEDIR?">
            <p className="text-[12px] text-[#c0c0d0] leading-relaxed">{info.what_is}</p>
          </Section>

          <Section icon="📊" title="NASIL OKUNUR?">
            <div className="space-y-1.5">
              {info.how_to_read.map((band, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 bg-[#111125] border border-[#2a2a3e] rounded-lg">
                  <span className="text-base shrink-0 mt-0.5">{band.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#e0e0f0]">{band.label}</span>
                      <span className="text-[10px] font-mono text-[#666]">{band.range}</span>
                    </div>
                    <div className="text-[11px] text-[#888] leading-snug mt-0.5">{band.meaning}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {currentValue && currentZone && (
            <Section icon="🎯" title="ŞU AN">
              <div className="bg-[#4fc3f7]/8 border border-[#4fc3f7]/30 rounded-lg px-3 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-mono font-bold text-[#4fc3f7]">{currentValue}</span>
                  <span className="text-[12px] text-[#e0e0f0]">→ {currentZone}</span>
                </div>
              </div>
            </Section>
          )}

          <Section icon="💡" title="NEDEN ÖNEMLİ?">
            <p className="text-[12px] text-[#c0c0d0] leading-relaxed italic">{info.why_matters}</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-bold tracking-wider text-[#666] uppercase">{title}</span>
      </div>
      {children}
    </div>
  );
}
