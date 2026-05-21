'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ALL_TERMS,
  CATEGORIES,
  getCategoryMeta,
  getSubcategories,
  getTermsByCategory,
  searchTerms,
  type GlossaryCategory,
  type GlossaryTerm,
} from '@/lib/glossary';

/**
 * AXIOM Sözlük — kategori grid → kategori liste → terim modal akışı.
 * Arama varken kategori filtresi devre dışı, tüm sözlükte flat sonuç.
 */
export default function GlossaryView() {
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategory | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  const searchResults = useMemo(() => (isSearching ? searchTerms(trimmed) : []), [
    isSearching,
    trimmed,
  ]);

  return (
    <div>
      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 Sözlükte ara: theta, CPI, RSI, F/K, MVRV…"
          className="w-full px-4 py-2.5 rounded-lg bg-[#161629] border border-[#26314a] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4fc3f7]"
        />
        <div className="text-[11px] text-gray-500 mt-1.5">
          {isSearching
            ? `${searchResults.length} sonuç`
            : `${ALL_TERMS.length} terim · ${CATEGORIES.length} kategori`}
        </div>
      </div>

      {/* Search mode — flat results */}
      {isSearching && (
        <SearchResults
          results={searchResults}
          onPick={(t) => setSelectedTerm(t)}
        />
      )}

      {/* Browse mode — category grid OR category detail */}
      {!isSearching && !selectedCategory && (
        <CategoryGrid onSelect={setSelectedCategory} />
      )}

      {!isSearching && selectedCategory && (
        <CategoryDetail
          category={selectedCategory}
          onBack={() => setSelectedCategory(null)}
          onPick={(t) => setSelectedTerm(t)}
        />
      )}

      {/* Modal */}
      {selectedTerm && (
        <TermModal term={selectedTerm} onClose={() => setSelectedTerm(null)} />
      )}
    </div>
  );
}

/* ---------- Category Grid ---------- */

function CategoryGrid({ onSelect }: { onSelect: (c: GlossaryCategory) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((c) => {
        const count = getTermsByCategory(c.id).length;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className="text-left rounded-xl border border-[#26314a] bg-[#161629] p-4 hover:border-[#4fc3f7]/60 hover:bg-[#1a1a2e] transition group"
            style={{
              borderLeftWidth: '3px',
              borderLeftColor: c.color,
            }}
          >
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl shrink-0">{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-white mb-0.5">{c.label}</div>
                <div className="text-[11px] font-mono" style={{ color: c.color }}>
                  {count} terim
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-snug">{c.description}</p>
            <div className="mt-3 text-[11px] text-gray-500 group-hover:text-[#4fc3f7] transition">
              Aç →
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Category Detail (subcategory + term chips) ---------- */

function CategoryDetail({
  category,
  onBack,
  onPick,
}: {
  category: GlossaryCategory;
  onBack: () => void;
  onPick: (t: GlossaryTerm) => void;
}) {
  const meta = getCategoryMeta(category);
  const terms = getTermsByCategory(category);
  const subs = getSubcategories(category);

  const grouped: { sub: string | null; items: GlossaryTerm[] }[] = [];
  if (subs.length > 0) {
    subs.forEach((s) => {
      grouped.push({ sub: s, items: terms.filter((t) => t.subcategory === s) });
    });
    const noSub = terms.filter((t) => !t.subcategory);
    if (noSub.length > 0) grouped.push({ sub: null, items: noSub });
  } else {
    grouped.push({ sub: null, items: terms });
  }

  return (
    <div>
      {/* Sticky-ish header */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-md border border-[#26314a] hover:border-[#4fc3f7]/50 transition"
        >
          ← Kategoriler
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className="text-lg font-bold text-white">{meta.label}</span>
          <span className="text-[11px] font-mono" style={{ color: meta.color }}>
            {terms.length} terim
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map(({ sub, items }, i) => (
          <div key={`${sub ?? 'no-sub'}-${i}`}>
            {sub && (
              <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">
                {sub}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {items.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => onPick(t)}
                  className="px-3 py-1.5 rounded-lg border border-[#26314a] bg-[#161629] text-sm text-gray-200 hover:border-[#4fc3f7] hover:text-white hover:bg-[#1a1a2e] transition"
                  title={t.full_tr}
                >
                  {t.short}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Search Results (flat) ---------- */

function SearchResults({
  results,
  onPick,
}: {
  results: GlossaryTerm[];
  onPick: (t: GlossaryTerm) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-[#26314a] bg-[#161629] p-6 text-center text-sm text-gray-400">
        Sonuç bulunamadı. Başka bir terim dene.
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {results.map((t) => {
        const meta = getCategoryMeta(t.category);
        return (
          <button
            key={t.slug}
            type="button"
            onClick={() => onPick(t)}
            className="text-left rounded-lg border border-[#26314a] bg-[#161629] p-3 hover:border-[#4fc3f7] hover:bg-[#1a1a2e] transition"
            style={{ borderLeftWidth: '3px', borderLeftColor: meta.color }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-white">{t.full_tr}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">
                {meta.emoji} {t.subcategory ?? meta.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-snug line-clamp-2">{t.what_is}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Modal ---------- */

function TermModal({ term, onClose }: { term: GlossaryTerm; onClose: () => void }) {
  const meta = getCategoryMeta(term.category);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d1a] border border-[#2a2a3e] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTopWidth: '3px', borderTopColor: meta.color }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0d0d1a] border-b border-[#2a2a3e] px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              {meta.emoji} {meta.label}
              {term.subcategory ? ` · ${term.subcategory}` : ''}
            </div>
            <div className="text-base font-bold text-[#e0e0f0]">{term.full_tr}</div>
            <div className="text-[11px] text-[#666]">
              {term.full_en ? `${term.full_en} · ` : ''}
              {term.short}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#1a1a2e] hover:bg-[#ff4757]/20 text-[#888] hover:text-[#ff4757] flex items-center justify-center transition shrink-0"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          <Section icon="📖" title="NEDIR?">
            <p className="text-[12px] text-[#c0c0d0] leading-relaxed">{term.what_is}</p>
          </Section>

          {term.how_to_read && term.how_to_read.length > 0 && (
            <Section icon="📊" title="NASIL OKUNUR?">
              <div className="space-y-1.5">
                {term.how_to_read.map((band, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 bg-[#111125] border border-[#2a2a3e] rounded-lg"
                  >
                    <span className="text-base shrink-0 mt-0.5">{band.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-[#e0e0f0]">{band.label}</span>
                        <span className="text-[10px] font-mono text-[#666]">{band.range}</span>
                      </div>
                      <div className="text-[11px] text-[#888] leading-snug mt-0.5">
                        {band.meaning}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section icon="💡" title="NEDEN ÖNEMLİ?">
            <p className="text-[12px] text-[#c0c0d0] leading-relaxed italic">
              {term.why_matters}
            </p>
          </Section>

          {term.pitfall && (
            <Section icon="⚠️" title="DİKKAT">
              <p className="text-[12px] text-[#c0c0d0] leading-relaxed">{term.pitfall}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
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
