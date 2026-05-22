'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiClient,
  type AcademyCurriculum,
  type AcademyProgressSummary,
  type AcademyScenarioCard,
} from '@/lib/api';
import ModuleSidebar from './ModuleSidebar';
import LessonView from './LessonView';
import GlossarySearchBar from './GlossarySearchBar';
import GlossaryView from './GlossaryView';
import ScenarioGrid from './ScenarioGrid';
import LiveContextBadge from './LiveContextBadge';

// Hardcoded: Vercel env eski değer taşıyıp override ediyordu — bkz settings/page.
const BOT_USERNAME = 'AxiomAnaliz_Bot';
const UPGRADE_LINK = `https://t.me/${BOT_USERNAME}?start=upgrade_premium`;
const LOGIN_LINK = `https://t.me/${BOT_USERNAME}?start=login`;

const TIER_LABEL: Record<string, string> = {
  free: '🆓 Ücretsiz',
  premium: '💎 Premium',
  advance: '🚀 Advance',
};

export default function AcademyClient() {
  const [curriculum, setCurriculum] = useState<AcademyCurriculum | null>(null);
  const [scenarios, setScenarios] = useState<AcademyScenarioCard[]>([]);
  const [progress, setProgress] = useState<AcademyProgressSummary | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lessons' | 'glossary'>('lessons');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  // İlk yükleme — curriculum, scenarios, (opsiyonel) progress
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsAuth(apiClient.isAuthenticated());

    Promise.all([
      apiClient.getAcademyCurriculum(),
      apiClient.getAcademyScenarioCards(),
    ])
      .then(([curr, sc]) => {
        if (cancelled) return;
        setCurriculum(curr);
        setScenarios(sc.cards);
        // İlk açılan ders: ilk modülün ilk dersi (M1L1).
        const first = curr.modules[0]?.lessons[0];
        if (first) setActiveLessonId(first.id);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Akademi yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (apiClient.isAuthenticated()) {
      apiClient
        .getAcademyProgress()
        .then((p) => {
          if (!cancelled) setProgress(p);
        })
        .catch(() => {
          // Progress başarısızsa sayfa yine çalışmalı.
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProgress = useCallback(() => {
    if (!apiClient.isAuthenticated()) return;
    apiClient
      .getAcademyProgress()
      .then((p) => setProgress(p))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-gray-400">Akademi yükleniyor…</div>
      </div>
    );
  }

  // Curriculum hata verirse Sözlük sekmesi yine çalışır (tamamen client-side).
  // Sadece Dersler sekmesi inline hata gösterir.
  const tier = curriculum?.user_tier;
  const isFree = !tier || tier === 'free';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        {tier && (
          <div className="flex items-center justify-end mb-2">
            <span className="text-xs px-2.5 py-1 rounded-full border border-[#26314a] text-gray-300">
              {TIER_LABEL[tier] || tier}
            </span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          🎓 AXIOM Opsiyon Akademisi
        </h1>
        <p className="text-gray-400 max-w-3xl">
          Opsiyon ve <strong className="text-white">hedge kültürünü</strong> Türkçe sezgi
          diliyle öğren. <em>Delta = Fiyat Duyarlılığı, Theta = Zaman Kaybı Hızı.</em>{' '}
          Saat çarkı (horology) metaforuyla opsiyonun zamanını his ile anlat.
        </p>
        <p className="text-xs text-gray-500 italic mt-2">
          Bu içerik EĞİTİM amaçlıdır. Yatırım tavsiyesi değildir (SPK).
        </p>
      </header>

      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 border-b border-[#26314a]">
        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'lessons'
              ? 'border-[#4fc3f7] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          📚 Dersler
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('glossary')}
          className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'glossary'
              ? 'border-[#4fc3f7] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          📖 Sözlük
        </button>
      </div>

      {activeTab === 'lessons' && (
        <>
          {/* Search bar */}
          <div className="mb-6">
            <GlossarySearchBar />
          </div>

          {/* Faz 1.6 — Canlı bağlam rozeti */}
          <div className="mb-6">
            <LiveContextBadge />
          </div>
        </>
      )}

      {/* Free CTA */}
      {isFree && (
        <div className="mb-6 rounded-xl border border-[#a78bfa]/40 bg-gradient-to-r from-[#a78bfa]/10 to-transparent p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#a78bfa] mb-0.5">
              💎 Premium ile M2–M4 + ileri stratejiler
            </div>
            <div className="text-xs text-gray-400">
              Modül 1 + sözlük ücretsiz. Greeks, IV, hedge stratejileri ve quiz
              ilerlemen Premium ile açılır.
            </div>
          </div>
          <a
            href={UPGRADE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-[#a78bfa] text-[#0e0e1a] font-semibold text-sm hover:bg-[#a78bfa]/90 whitespace-nowrap"
          >
            Premium'a yükselt
          </a>
        </div>
      )}

      {/* Login CTA (free + henüz girişsiz) */}
      {!isAuth && (
        <div className="mb-6 rounded-xl border border-[#4fc3f7]/30 bg-[#4fc3f7]/5 p-4 text-sm">
          <div className="text-[#4fc3f7] font-semibold mb-1">📝 İlerlemeni kaydet</div>
          <p className="text-gray-300 text-xs">
            Modül ilerlemeni ve quiz sonuçlarını kaydetmek için Telegram bot'unda{' '}
            <code className="text-white">/login</code> komutunu çalıştır.{' '}
            <a
              href={LOGIN_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4fc3f7] hover:underline"
            >
              Telegram'da aç →
            </a>
          </p>
        </div>
      )}

      {activeTab === 'lessons' ? (
        !curriculum ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            {error ?? 'Dersler yüklenemedi.'} — Sözlük sekmesi yine kullanılabilir.
          </div>
        ) : (
          <>
            {/* Main split: sidebar + lesson */}
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <aside>
                <ModuleSidebar
                  modules={curriculum.modules}
                  activeLessonId={activeLessonId}
                  onLessonSelect={setActiveLessonId}
                  progress={progress}
                />
              </aside>
              <section>
                {activeLessonId ? (
                  <LessonView
                    lessonId={activeLessonId}
                    isAuthenticated={isAuth}
                    onProgressChange={refreshProgress}
                  />
                ) : (
                  <div className="text-gray-400">Bir ders seç ↑</div>
                )}
              </section>
            </div>

            {/* Scenario cards */}
            <ScenarioGrid cards={scenarios} />
          </>
        )
      ) : (
        <GlossaryView />
      )}
    </div>
  );
}
