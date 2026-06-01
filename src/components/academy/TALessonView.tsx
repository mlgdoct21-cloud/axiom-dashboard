'use client';

import { useEffect, useState } from 'react';
import { apiClient, type TALessonResponse } from '@/lib/api';
import { TAExampleModal } from './TAExampleModal';

interface Props {
  lessonId: string;
  isAuthenticated: boolean;
  userTier?: string;
}

/**
 * TA dersi → canlı "Gerçek Örnek" teknik eşlemesi.
 *
 * Her ders en sıkı bağlantılı tek tekniğe yönlendirir. Free kullanıcılar M1L4
 * (fiyat aksiyonu) ve M5L1 (doji) üzerinden engulfing-reversal tadımlığını
 * alır — kalan tekniklerde upsell.
 */
const TA_LIVE_EXAMPLE_BY_SLUG: Record<string, { technique: string; label: string }> = {
  // M1 (free)
  'mum-nedir':                   { technique: 'engulfing-reversal', label: 'Yutan Formasyon — Canlı OHLC' },
  'fiyat-aksiyonu-vs-gurultu':   { technique: 'engulfing-reversal', label: 'Yutan Formasyon — Canlı Tespit' },
  // M2 (premium)
  'destek-direnc-cizmek':        { technique: 'support-resistance-bounce', label: 'S/R Sıçraması — Canlı Seviyeler' },
  'trend-cizgisi-disiplini':     { technique: 'trendline-break',  label: 'Trend Çizgisi Kırılımı — Canlı' },
  'kanallar':                    { technique: 'trendline-break',  label: 'Kanal & Trendline — Canlı' },
  'kirilim-vs-sahte-kirilim':    { technique: 'support-resistance-bounce', label: 'Kırılım Adayı — Canlı S/R' },
  // M3 (premium)
  'ucgenler':                    { technique: 'triangle-breakout', label: 'Üçgen Kırılımı — Canlı Tespit' },
  // M4 (premium)
  'omuz-bas-omuz':               { technique: 'head-shoulders',   label: 'Omuz-Baş-Omuz — Canlı Tespit' },
  'ikili-tepe-dip':              { technique: 'double-bottom',    label: 'İkili Dip / Tepe — Canlı Tespit' },
  // M5 (M5L1 free)
  'doji-ailesi':                 { technique: 'engulfing-reversal', label: 'Yutan Formasyon — Canlı Tespit' },
  'yutan-formasyon':             { technique: 'engulfing-reversal', label: 'Yutan Formasyon — Canlı Tespit' },
};

const BOT_USERNAME = 'AxiomAnaliz_Bot';
const UPGRADE_LINK = `https://t.me/${BOT_USERNAME}?start=upgrade_premium`;

export default function TALessonView({ lessonId, userTier }: Props) {
  const isPaid = userTier === 'premium' || userTier === 'advance';
  const [payload, setPayload] = useState<TALessonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exampleOpen, setExampleOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getTALesson(lessonId)
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
        {les.learning_objective && (
          <p className="text-sm text-[#a78bfa] mb-4 italic">{les.learning_objective}</p>
        )}
        <p className="text-gray-300 mb-3">
          Bu ders <strong className="text-[#a78bfa]">Premium</strong> erişim gerektiriyor.
        </p>
        <ul className="inline-block text-left text-sm text-gray-300 mb-6 space-y-1">
          <li>✓ Tüm formasyonlar, Fibonacci, indikatör müfredatı</li>
          <li>✓ 6 canlı "Gerçek Örnek" tekniği (BTC/ETH/AAPL/SPY)</li>
          <li>✓ Karakter senaryolarıyla adım adım öğrenim</li>
        </ul>
        <a
          href={UPGRADE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-[#a78bfa] px-6 py-3 font-semibold text-white hover:bg-[#9170f0]"
        >
          Premium'a Yükselt →
        </a>
      </article>
    );
  }

  const liveExample = TA_LIVE_EXAMPLE_BY_SLUG[les.slug];

  return (
    <article className="rounded-xl border border-[#26314a] bg-[#11142a] p-6">
      <header className="mb-4">
        <p className="text-xs text-gray-500 mb-1">{payload.module_title}</p>
        <h2 className="text-2xl font-bold text-white mb-1">{les.title}</h2>
        {les.learning_objective && (
          <p className="text-sm text-[#4fc3f7] italic">{les.learning_objective}</p>
        )}
      </header>

      {/* Ders gövdesi (hikaye formatı) */}
      {les.body && (
        <div className="prose prose-invert max-w-none mb-6 whitespace-pre-line text-gray-300 leading-relaxed text-[15px]">
          {les.body}
        </div>
      )}

      {/* Worked examples */}
      {les.worked_examples && les.worked_examples.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-[#4fc3f7] mb-2 uppercase tracking-wider">
            📊 Senaryolar
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {les.worked_examples.map((ex, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-[#26314a] bg-[#0f1320] p-3"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {ex.asset} · <span className="text-[#4fc3f7]">{ex.symbol}</span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-line">{ex.scenario}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Navigation note (navigation_link metaforu) */}
      {les.navigation_note && (
        <div className="mb-6 rounded-lg border border-[#4fc3f7]/30 bg-[#4fc3f7]/5 p-3">
          <div className="text-xs text-[#4fc3f7] mb-1 font-semibold">
            🧭 Navigasyon Sezgisi
          </div>
          <p className="text-sm text-gray-300 italic">{les.navigation_note}</p>
        </div>
      )}

      {/* Canlı Gerçek Örnek butonu */}
      {liveExample && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setExampleOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a78bfa] to-[#4fc3f7] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            📈 {liveExample.label}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Bugünün canlı OHLC verisinde formasyonu kendi gözünle gör.
          </p>
        </div>
      )}

      {/* Quiz */}
      {les.quiz && (
        <section className="mb-2 rounded-lg border border-[#26314a] bg-[#0f1320] p-4">
          <h3 className="text-sm font-semibold text-[#26de81] mb-3 uppercase tracking-wider">
            💡 Hızlı Kontrol
          </h3>
          <p className="text-sm text-white mb-3">{les.quiz.question}</p>
          <div className="space-y-1.5">
            {les.quiz.options.map((opt, idx) => (
              <div
                key={idx}
                className="px-3 py-2 text-sm text-gray-300 rounded border border-[#26314a]/50"
              >
                {idx + 1}. {opt.text}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 italic">
            (Quiz tamamlama: Telegram'da <code>/login</code> sonrası açılır.)
          </p>
        </section>
      )}

      {/* Sözlük referansları */}
      {les.glossary_refs && les.glossary_refs.length > 0 && (
        <section className="mt-6 pt-4 border-t border-[#26314a]">
          <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            📖 Sözlük
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {les.glossary_refs.map((ref) => (
              <span
                key={ref}
                className="px-2 py-0.5 rounded bg-[#1c2030] text-xs text-gray-400"
              >
                {ref}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Modal */}
      {exampleOpen && liveExample && (
        <TAExampleModal
          technique={liveExample.technique}
          techniqueLabel={liveExample.label}
          onClose={() => setExampleOpen(false)}
          showUpsell={!isPaid}
        />
      )}
    </article>
  );
}
