'use client';

import type { AcademyScenarioCard } from '@/lib/api';

interface Props {
  cards: AcademyScenarioCard[];
}

export default function ScenarioGrid({ cards }: Props) {
  if (cards.length === 0) return null;
  return (
    <section className="mt-12 pt-8 border-t border-[#26314a]">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">🎯 Senaryo Sihirbazı</h2>
        <p className="text-sm text-gray-400">
          &quot;Piyasa beklentin ne?&quot; sorusundan stratejiye — eğitici kavramsal kartlar (canlı fiyat yok).
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-[#26314a] bg-[#161629] p-5"
          >
            <div className="text-xs font-mono text-[#4fc3f7] mb-2">{c.id}</div>
            <p className="text-white font-medium mb-3 leading-snug">
              &ldquo;{c.market_view}&rdquo;
            </p>
            <div className="text-xs uppercase tracking-wider text-[#a78bfa] mb-1">
              → {c.suggested_strategy.replace(/-/g, ' ')}
            </div>
            <p className="text-sm text-gray-300 mb-3 italic">{c.why}</p>
            <dl className="space-y-1 text-xs">
              <div className="flex gap-2">
                <dt className="text-[#26de81] flex-shrink-0">Max kâr:</dt>
                <dd className="text-gray-300">{c.max_gain}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-red-400 flex-shrink-0">Max zarar:</dt>
                <dd className="text-gray-300">{c.max_loss}</dd>
              </div>
            </dl>
            {c.horology_note && (
              <p className="mt-3 pt-3 border-t border-[#26314a] text-[11px] text-gray-500 italic">
                🕰️ {c.horology_note}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
