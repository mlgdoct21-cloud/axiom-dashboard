'use client';

import { useEffect, useState } from 'react';
import { apiClient, type AcademyLesson, type AcademyLessonResponse } from '@/lib/api';
import MiniQuiz from './MiniQuiz';
import ThetaWheel from './ThetaWheel';
import LiveExampleModal from './LiveExampleModal';

interface Props {
  lessonId: string;
  isAuthenticated: boolean;
  onProgressChange?: () => void;
}

// Ders slug'ı → canlı 'Gerçek Örnek' stratejisi. Birden fazla slug aynı
// stratejiye bağlanabilir (örn. covered call'un giriş + sistematik dersleri).
const LIVE_EXAMPLE_BY_SLUG: Record<string, { strategy: string; label: string }> = {
  'protective-put': { strategy: 'protective-put', label: 'Protective Put — Portföy Sigortası' },
  'covered-call': { strategy: 'covered-call', label: 'Covered Call — Yatay Piyasada Kira' },
  'covered-call-sistematigi': { strategy: 'covered-call', label: 'Covered Call — Kira Merdiveni' },
  'cash-secured-put': { strategy: 'cash-secured-put', label: 'Cash-Secured Put — İndirimli Giriş + Prim' },
  'iron-condor': { strategy: 'iron-condor', label: 'Iron Condor — İki Taraflı Tanımlı Risk' },
  'debit-spreadler': { strategy: 'debit-spread', label: 'Debit Spread (Bull Call) — Ucuz Tanımlı Yön' },
  'credit-spreadler': { strategy: 'credit-spread', label: 'Credit Spread (Bull Put) — Prim Toplayan Yön' },
  'straddle-strangle-derin': { strategy: 'straddle', label: 'Straddle — Volatilite / Büyük Hareket Bahsi' },
  'spread-straddle-giris': { strategy: 'straddle', label: 'Straddle — Çok Bacaklı Yapılara Giriş' },
};

export default function LessonView({ lessonId, isAuthenticated, onProgressChange }: Props) {
  const [payload, setPayload] = useState<AcademyLessonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveExampleOpen, setLiveExampleOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getAcademyLesson(lessonId)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ders yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (loading) return <div className="text-gray-400 p-4">Ders yükleniyor…</div>;
  if (error) return <div className="text-red-300 p-4">{error}</div>;
  if (!payload) return null;

  const les = payload.lesson;

  if (les.locked) {
    return (
      <article className="rounded-xl border border-[#a78bfa]/30 bg-gradient-to-br from-[#1a1a2e] to-[#161629] p-8 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-2">{les.title}</h2>
        <p className="text-gray-400 mb-1">{payload.module_title}</p>
        <p className="text-sm text-[#a78bfa] mb-4 italic">{les.learning_objective}</p>
        <p className="text-gray-300 mb-6">
          Bu ders <strong className="text-[#a78bfa]">Premium</strong> erişim gerektiriyor.
          Tüm modüllere, ileri stratejilere ve quiz ilerlemene Premium ile ulaşırsın.
        </p>
        <a
          href="https://t.me/AxiomAnaliz_Bot?start=upgrade_premium"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 rounded-lg bg-[#a78bfa] text-[#0e0e1a] font-semibold hover:bg-[#a78bfa]/90"
        >
          💎 Premium'a yükselt
        </a>
      </article>
    );
  }

  const showThetaWheel = les.id === 'M2L2' || les.horology_link === 'escapement' || les.horology_link === 'mainspring';
  const liveExample = LIVE_EXAMPLE_BY_SLUG[les.slug];

  return (
    <article className="space-y-6">
      <header>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
          {payload.module_title}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{les.title}</h2>
        <p className="text-sm text-[#4fc3f7] italic">{les.learning_objective}</p>
      </header>

      <section className="rounded-xl border border-[#26314a] bg-[#161629] p-6">
        <div className="text-gray-200 whitespace-pre-line leading-relaxed text-[15px]">
          {les.body}
        </div>
      </section>

      {liveExample && (
        <button
          type="button"
          onClick={() => setLiveExampleOpen(true)}
          className="w-full flex items-center justify-between rounded-xl border border-[#4fc3f7]/40 bg-gradient-to-r from-[#4fc3f7]/10 to-[#a78bfa]/10 px-5 py-3 hover:from-[#4fc3f7]/20 hover:to-[#a78bfa]/20 transition"
        >
          <span className="text-sm font-semibold text-[#4fc3f7]">
            📊 Bunu bugünün gerçek rakamlarıyla gör
          </span>
          <span className="text-xs text-gray-400">canlı örnek →</span>
        </button>
      )}

      {liveExample && liveExampleOpen && (
        <LiveExampleModal
          strategy={liveExample.strategy}
          strategyLabel={liveExample.label}
          onClose={() => setLiveExampleOpen(false)}
        />
      )}

      {showThetaWheel && (
        <div>
          <ThetaWheel />
        </div>
      )}

      {les.worked_examples && les.worked_examples.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[#26de81] uppercase tracking-wider mb-3">
            📌 Worked Examples
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {les.worked_examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-xl border border-[#26314a] bg-[#161629] p-4"
              >
                <div className="text-xs text-[#a78bfa] uppercase tracking-wider mb-2">
                  {ex.asset === 'crypto' ? '🪙 Kripto' : '🇺🇸 ABD Endeks'}
                  {ex.symbol && (
                    <span className="ml-2 font-mono text-gray-400">{ex.symbol}</span>
                  )}
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                  {ex.scenario}
                </p>
                {ex.spekulasyon_karsiti && (
                  <div className="mt-3 pt-3 border-t border-[#26314a]">
                    <div className="text-xs text-red-400 uppercase tracking-wider mb-1">
                      ⚠️ Spekülasyon karşıtı
                    </div>
                    <p className="text-xs text-gray-400 whitespace-pre-line">
                      {ex.spekulasyon_karsiti}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {les.horology_note && (
        <div className="rounded-xl border border-[#a78bfa]/30 bg-[#a78bfa]/5 p-4">
          <div className="text-xs text-[#a78bfa] uppercase tracking-wider mb-1">
            🕰️ Horology
          </div>
          <p className="text-sm text-gray-200 italic">{les.horology_note}</p>
        </div>
      )}

      {les.glossary_refs && les.glossary_refs.length > 0 && (
        <div className="text-xs text-gray-500">
          <span className="uppercase tracking-wider mr-2">Sözlük:</span>
          {les.glossary_refs.map((slug, i) => (
            <span key={slug}>
              <a
                href={`#sozluk-${slug}`}
                className="text-[#4fc3f7] hover:underline"
              >
                {slug}
              </a>
              {i < (les.glossary_refs?.length ?? 0) - 1 && <span className="text-gray-600">, </span>}
            </span>
          ))}
        </div>
      )}

      {les.quiz && (
        <MiniQuiz
          lessonId={les.id}
          quiz={les.quiz}
          isAuthenticated={isAuthenticated}
          onCompleted={onProgressChange}
        />
      )}

      <footer className="border-t border-[#26314a] pt-4 text-xs text-gray-500 text-center italic">
        Bu içerik EĞİTİM amaçlıdır. Yatırım tavsiyesi değildir (SPK).
      </footer>
    </article>
  );
}
