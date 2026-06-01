'use client';

/**
 * TA Akademisi track'i — AcademyClient'in 3. iç-tab'ı tarafından mount edilir.
 *
 * Kendi içinde:
 *   - Modül/ders sidebar (basit, kendi içinde tier-gate gösterimi)
 *   - TALessonView (aktif ders gövdesi + canlı örnek modal)
 *   - TAGlossary listesi (sub-tab)
 *
 * Bağımsız component — opsiyon akademisinin state'iyle çakışmaz.
 */

import { useEffect, useState } from 'react';
import {
  apiClient,
  type TACurriculum,
  type TAGlossary,
  type TAGlossaryTerm,
} from '@/lib/api';
import TALessonView from './TALessonView';

const SECTION_LABELS: Record<string, { label: string; emoji: string }> = {
  yapi: { label: 'Yapı', emoji: '🏗️' },
  seviyeler: { label: 'Seviyeler', emoji: '📐' },
  formasyon: { label: 'Formasyon', emoji: '🎯' },
  mum_desenleri: { label: 'Mum Desenleri', emoji: '🕯️' },
  fibonacci: { label: 'Fibonacci', emoji: '🌀' },
  indikatorler: { label: 'İndikatörler', emoji: '📊' },
  hacim: { label: 'Hacim', emoji: '🔊' },
  ileri_cerceve: { label: 'İleri Çerçeve', emoji: '🧭' },
};

interface Props {
  userTier?: string;
  isAuthenticated: boolean;
}

export default function TATrack({ userTier, isAuthenticated }: Props) {
  const [curriculum, setCurriculum] = useState<TACurriculum | null>(null);
  const [glossary, setGlossary] = useState<TAGlossary | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<'dersler' | 'sozluk'>('dersler');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([apiClient.getTACurriculum(), apiClient.getTAGlossary()])
      .then(([curr, gloss]) => {
        if (cancelled) return;
        setCurriculum(curr);
        setGlossary(gloss);
        const first = curr.modules[0]?.lessons[0];
        if (first) setActiveLessonId(first.id);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'TA Akademi yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-gray-400 p-4">📈 Teknik Analiz yükleniyor…</div>;
  }
  if (error || !curriculum) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
        {error ?? 'TA Akademi yüklenemedi.'}
      </div>
    );
  }

  // Sözlük arama (basit substring)
  const filteredTerms: Array<TAGlossaryTerm & { section: string }> = [];
  if (innerTab === 'sozluk' && glossary) {
    const q = search.trim().toLowerCase();
    for (const [section, entries] of Object.entries(glossary)) {
      if (section === 'metadata' || !Array.isArray(entries)) continue;
      for (const term of entries as TAGlossaryTerm[]) {
        const haystack = `${term.slug} ${term.tr} ${term.intuition ?? ''} ${term.one_liner ?? ''}`.toLowerCase();
        if (!q || haystack.includes(q)) {
          filteredTerms.push({ ...term, section });
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* İç-tab seçici */}
      <div className="flex items-center gap-1 border-b border-[#26314a]">
        <button
          type="button"
          onClick={() => setInnerTab('dersler')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-px ${
            innerTab === 'dersler'
              ? 'border-[#a78bfa] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          📚 Dersler
        </button>
        <button
          type="button"
          onClick={() => setInnerTab('sozluk')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-px ${
            innerTab === 'sozluk'
              ? 'border-[#a78bfa] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          📖 TA Sözlüğü
        </button>
      </div>

      {innerTab === 'dersler' ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-3">
            {curriculum.modules.map((mod) => (
              <div key={mod.id} className="rounded-lg border border-[#26314a] bg-[#0f1320]">
                <div className="px-3 py-2 border-b border-[#26314a]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-[#4fc3f7]">{mod.id}</div>
                    {mod.tier_required !== 'free' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#a78bfa]/20 text-[#a78bfa]">
                        🔒 {mod.tier_required}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5 leading-tight">
                    {mod.title.split(' — ')[0]}
                  </div>
                </div>
                <ul className="py-1">
                  {mod.lessons.map((l) => {
                    const active = activeLessonId === l.id;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => setActiveLessonId(l.id)}
                          className={`w-full text-left px-3 py-1.5 text-xs transition flex items-center justify-between gap-1 ${
                            active
                              ? 'bg-[#a78bfa]/10 text-white'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c2030]'
                          }`}
                        >
                          <span className="truncate">
                            {l.id} · {l.title.split(' — ')[0]}
                          </span>
                          {l.locked && <span className="text-[10px]">🔒</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>

          {/* Ders gövdesi */}
          <section>
            {activeLessonId ? (
              <TALessonView
                lessonId={activeLessonId}
                isAuthenticated={isAuthenticated}
                userTier={userTier}
              />
            ) : (
              <div className="text-gray-400">Soldan bir ders seç ↑</div>
            )}
          </section>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sözlükte ara (RSI, Fibonacci, çekiç, omuz-baş-omuz…)"
            className="w-full mb-4 px-4 py-2.5 rounded-lg border border-[#26314a] bg-[#0f1320] text-white placeholder-gray-500 focus:outline-none focus:border-[#a78bfa]"
          />
          {search && filteredTerms.length === 0 && (
            <div className="text-sm text-gray-500 mb-4">Sonuç yok.</div>
          )}
          {search ? (
            // Arama sonuçları flat liste
            <ul className="space-y-2">
              {filteredTerms.slice(0, 40).map((term) => {
                const sec = SECTION_LABELS[term.section] ?? { label: term.section, emoji: '•' };
                return (
                  <li
                    key={`${term.section}:${term.slug}`}
                    className="rounded-lg border border-[#26314a] bg-[#0f1320] p-3"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="text-sm font-semibold text-white">{term.tr}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c2030] text-gray-400 whitespace-nowrap">
                        {sec.emoji} {sec.label}
                      </span>
                    </div>
                    {term.intuition && (
                      <p className="text-xs text-gray-300 mb-1">{term.intuition}</p>
                    )}
                    {term.one_liner && (
                      <p className="text-xs text-gray-500 italic">{term.one_liner}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            // Kategori grid
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(glossary ?? {}).map(([section, entries]) => {
                if (section === 'metadata' || !Array.isArray(entries)) return null;
                const sec = SECTION_LABELS[section] ?? { label: section, emoji: '•' };
                const list = entries as TAGlossaryTerm[];
                return (
                  <div
                    key={section}
                    className="rounded-lg border border-[#26314a] bg-[#0f1320] p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{sec.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">{sec.label}</div>
                        <div className="text-xs text-gray-500">{list.length} terim</div>
                      </div>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {list.slice(0, 6).map((t) => (
                        <li
                          key={t.slug}
                          className="text-gray-400 hover:text-gray-200 cursor-pointer"
                          onClick={() => {
                            setSearch(t.tr);
                          }}
                        >
                          · {t.tr}
                        </li>
                      ))}
                      {list.length > 6 && (
                        <li className="text-[10px] text-gray-600">
                          +{list.length - 6} terim daha…
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
