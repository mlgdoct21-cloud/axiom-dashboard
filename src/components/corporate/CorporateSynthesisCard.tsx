'use client';

/**
 * CorporateSynthesisBody — haftalık AXIOM Kurumsal Sentez modal gövdesi.
 *
 * Artık inline kart değil: DashboardSummary'de MiniCorporateChip'e tıklanınca
 * SummaryDetailModal içinde render edilir. Modal başlığı/ikonu TITLE_MAP'ten
 * geldiği için burada dış Shell/başlık YOK. Durumlar: empty (synthesis null) ·
 * locked (free teaser + 🔒 Premium rozet + upgrade) · full (synthesis_md +
 * tier rozet). Veri tek fetch'le useCorporateSynthesis'ten gelir; chip ve
 * modal aynı objeyi paylaşır.
 */

import { useState } from 'react';
import InlineUpgradeModal from '@/components/ui/InlineUpgradeModal';
import type {
  CorporateResponse,
  FullSynthesis,
  LockedSynthesis,
} from '@/hooks/useCorporateSynthesis';

const TIER_BADGE: Record<string, { label: string; classes: string }> = {
  locked: { label: '🔒 Premium', classes: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  premium: { label: '💎 Premium', classes: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  advance: { label: '🚀 Advance', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};

function Badge({ kind }: { kind: keyof typeof TIER_BADGE }) {
  const b = TIER_BADGE[kind] ?? TIER_BADGE.locked;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${b.classes}`}>
      {b.label}
    </span>
  );
}

function renderMd(md: string) {
  // Hafif markdown: '## Başlık' → alt-başlık; '- ' madde; boş satır → paragraf.
  return md.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (t.startsWith('## ')) {
      return (
        <h4 key={i} className="text-[13px] font-semibold text-[#4fc3f7] mt-3 mb-1">
          {t.slice(3)}
        </h4>
      );
    }
    if (t === '---') return <hr key={i} className="my-3 border-white/10" />;
    if (t.startsWith('- ')) {
      return (
        <p key={i} className="text-[12px] text-slate-300 leading-relaxed pl-3">
          • {t.slice(2)}
        </p>
      );
    }
    return (
      <p key={i} className="text-[12px] text-slate-300 leading-relaxed">
        {t}
      </p>
    );
  });
}

export function CorporateSynthesisBody({ data }: { data: CorporateResponse | null }) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!data || data.error || data.synthesis === null) {
    return (
      <p className="text-[12px] text-slate-400 leading-relaxed">
        Haftalık kurumsal makro sentez henüz üretilmedi. Her Pazartesi
        08:30&apos;da yayınlanır.
      </p>
    );
  }

  const weekLine = data.week_start ? (
    <p className="text-[11px] text-slate-500 mb-2">Hafta: {data.week_start}</p>
  ) : null;

  if (data.locked) {
    const s = data.synthesis as LockedSynthesis;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          {weekLine ?? <span />}
          <Badge kind="locked" />
        </div>
        <p className="text-[12px] text-slate-300 leading-relaxed blur-[2px] select-none">
          {s.teaser}
        </p>
        <p className="text-[12px] text-slate-400 mt-3">{s.upgrade_cta}</p>
        <button
          type="button"
          onClick={() => setShowUpgrade(true)}
          className="inline-block mt-3 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition"
        >
          💎 Premium ile aç
        </button>
        <InlineUpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          targetTier="premium"
          reason="Haftalık karşılaştırmalı kurumsal makro sentez"
        />
      </div>
    );
  }

  const s = data.synthesis as FullSynthesis;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {weekLine ?? <span />}
        <Badge kind={data.tier === 'advance' ? 'advance' : 'premium'} />
      </div>
      <div className="space-y-0.5">{renderMd(s.synthesis_md)}</div>
      {s.generated_at && (
        <p className="text-[10px] text-slate-600 mt-3">
          Üretim: {new Date(s.generated_at).toLocaleString('tr-TR')}
          {s.source_count != null ? ` · ${s.source_count} kaynak` : ''}
        </p>
      )}
    </div>
  );
}
