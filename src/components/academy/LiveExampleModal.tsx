'use client';

import { useEffect, useState } from 'react';
import { apiClient, type AcademyLiveExample, type AcademyLiveExampleMetric, type AcademyLiveExampleTeaching } from '@/lib/api';

interface Props {
  strategy: string;        // örn. 'protective-put'
  strategyLabel: string;   // başlıkta gösterilecek ad
  onClose: () => void;
  showUpsell?: boolean;    // free kullanıcı → 'Premium'da 6 strateji daha' kancası
}

const UPGRADE_LINK = 'https://t.me/AxiomAnaliz_Bot?start=upgrade_premium';

const ASSETS = ['BTC', 'ETH', 'SPY', 'AAPL', 'QQQ'] as const;
type Asset = (typeof ASSETS)[number];

const KIND_COLOR: Record<AcademyLiveExampleMetric['kind'], string> = {
  loss: '#ff5c5c',
  gain: '#26de81',
  neutral: '#4fc3f7',
};

function usd(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' $';
}

function metricText(m: AcademyLiveExampleMetric): string {
  if (m.display) return m.display;
  return usd(m.value);
}

/** Basit inline SVG payoff grafiği — ekstra bağımlılık yok. Çok bacaklı yapıları destekler. */
function PayoffChart({ data }: { data: AcademyLiveExample }) {
  const pts = data.payoff ?? [];
  if (pts.length < 2) return null;

  const W = 480;
  const H = 200;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 20;

  const prices = pts.map((p) => p.price);
  const pnls = pts.map((p) => p.pnl);
  const minX = Math.min(...prices);
  const maxX = Math.max(...prices);
  const minY = Math.min(...pnls);
  const maxY = Math.max(...pnls);
  const spanY = maxY - minY || 1;

  const sx = (x: number) => padL + ((x - minX) / (maxX - minX || 1)) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - (y - minY) / spanY) * (H - padT - padB);

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.price).toFixed(1)},${sy(p.pnl).toFixed(1)}`).join(' ');
  const zeroY = sy(0);
  const spotX = data.spot !== undefined ? sx(data.spot) : null;

  // Tüm strike'lar (dedup) — çok bacaklı yapılarda birden fazla dikey çizgi.
  const rawStrikes = data.strikes && data.strikes.length > 0 ? data.strikes : (data.strike !== undefined ? [data.strike] : []);
  const strikes = Array.from(new Set(rawStrikes)).filter((k) => k >= minX && k <= maxX);

  const areaTop = line;
  const areaClose = `L${sx(pts[pts.length - 1].price).toFixed(1)},${zeroY.toFixed(1)} L${sx(pts[0].price).toFixed(1)},${zeroY.toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <clipPath id="above"><rect x="0" y="0" width={W} height={Math.max(0, zeroY)} /></clipPath>
        <clipPath id="below"><rect x="0" y={zeroY} width={W} height={Math.max(0, H - zeroY)} /></clipPath>
      </defs>
      {/* alanlar */}
      <path d={`${areaTop} ${areaClose}`} fill="#26de81" opacity="0.12" clipPath="url(#above)" />
      <path d={`${areaTop} ${areaClose}`} fill="#ff5c5c" opacity="0.12" clipPath="url(#below)" />
      {/* sıfır çizgisi */}
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#5b6480" strokeWidth="1" strokeDasharray="4 3" />
      {/* strike çizgileri */}
      {strikes.map((k, i) => {
        const x = sx(k);
        return (
          <g key={`k-${i}`}>
            <line x1={x} y1={padT} x2={x} y2={H - padB} stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 3" />
            {strikes.length <= 4 && (
              <text x={x} y={H - 6} fill="#a78bfa" fontSize="8" textAnchor="middle">{usd(k)}</text>
            )}
          </g>
        );
      })}
      {/* spot */}
      {spotX !== null && (
        <line x1={spotX} y1={padT} x2={spotX} y2={H - padB} stroke="#4fc3f7" strokeWidth="1" />
      )}
      {/* payoff eğrisi */}
      <path d={line} fill="none" stroke="#e6e6f0" strokeWidth="2" />
      {/* spot etiketi */}
      {spotX !== null && (
        <text x={spotX} y={padT - 2} fill="#4fc3f7" fontSize="9" textAnchor="middle">bugün</text>
      )}
    </svg>
  );
}

/** Adım adım öğretmen-öğrenci anlatımı: giriş + numaralı senaryolar + ders. */
function Teaching({ t }: { t: AcademyLiveExampleTeaching }) {
  return (
    <div className="mb-4">
      <p className="text-sm text-gray-200 leading-relaxed mb-3">{t.intro}</p>
      <ol className="space-y-2 mb-3">
        {t.steps.map((s, i) => {
          const isLoss = s.pnl?.trimStart().startsWith('−') || s.pnl?.trimStart().startsWith('-');
          return (
            <li key={i} className="flex gap-2.5 rounded-xl border border-[#26314a] bg-[#0e0e1a] p-2.5">
              <span className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4fc3f7]/15 text-[11px] font-bold text-[#4fc3f7]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</span>
                  {s.pnl && (
                    <span
                      className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold"
                      style={{
                        color: isLoss ? '#ff5c5c' : '#26de81',
                        background: (isLoss ? '#ff5c5c' : '#26de81') + '1f',
                      }}
                    >
                      {s.pnl}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-gray-300">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="rounded-xl border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-3 py-2 text-[13px] text-[#cbb6ff]">
        <span className="font-semibold">📌 Ders: </span>{t.takeaway}
      </div>
    </div>
  );
}

function LegTable({ data }: { data: AcademyLiveExample }) {
  const legs = data.legs ?? [];
  if (legs.length === 0) return null;
  return (
    <div className="rounded-xl border border-[#26314a] bg-[#0e0e1a] p-3 mb-4">
      <div className="text-xs text-gray-500 mb-2">Pozisyon bacakları</div>
      <div className="space-y-1">
        {legs.map((leg, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 rounded font-semibold ${
                  leg.side === 'long' ? 'bg-[#26de81]/15 text-[#26de81]' : 'bg-[#ff5c5c]/15 text-[#ff5c5c]'
                }`}
              >
                {leg.side === 'long' ? 'AL' : 'SAT'}
              </span>
              <span className="text-gray-300">
                {usd(leg.strike)} {leg.type === 'call' ? 'Call' : 'Put'}
              </span>
            </span>
            <span className="text-gray-400">prim {usd(leg.premium)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LiveExampleModal({ strategy, strategyLabel, onClose, showUpsell }: Props) {
  const [asset, setAsset] = useState<Asset>('BTC');
  const [data, setData] = useState<AcademyLiveExample | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    apiClient
      .getAcademyLiveExample(strategy, asset)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e instanceof Error ? e.message : 'Veri alınamadı.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [strategy, asset]);

  const source = data?.data_source;
  const metrics = data?.metrics ?? [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#26314a] bg-[#12121f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* başlık */}
        <div className="flex items-center justify-between border-b border-[#26314a] px-5 py-3">
          <div>
            <div className="text-xs text-[#4fc3f7] uppercase tracking-wider">📊 Gerçek Örnek · canlı</div>
            <h3 className="text-lg font-bold text-white">{strategyLabel}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none px-2">✕</button>
        </div>

        {/* varlık seçimi */}
        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {ASSETS.map((a) => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                asset === a ? 'bg-[#4fc3f7] text-[#0e0e1a]' : 'bg-[#1c1c2e] text-gray-300 hover:bg-[#26263e]'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading && <div className="text-gray-400 py-8 text-center">Canlı veri çekiliyor…</div>}
          {err && <div className="text-red-300 py-8 text-center">{err}</div>}
          {!loading && !err && data && !data.available && (
            <div className="text-gray-400 py-8 text-center">
              Şu an canlı veri alınamadı. Birazdan tekrar dene.
            </div>
          )}

          {!loading && !err && data?.available && (
            <>
              {/* veri kaynağı rozeti */}
              {source === 'deribit_live' && (
                <div className="mb-3 rounded-lg border border-[#26de81]/30 bg-[#26de81]/10 px-3 py-2 text-xs text-[#26de81]">
                  ✅ Canlı Deribit opsiyon verisi
                  {data.iv_pct != null && <> · ort. IV %{data.iv_pct}</>}
                </div>
              )}
              {source === 'theoretical_fallback' && (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  ⚠️ Canlı opsiyon zinciri (Deribit) şu an alınamadı — primler
                  <strong> Black-Scholes ile hesaplanmış teorik tahmindir</strong> (spot canlı).
                  Yayında gerçek piyasa primleri gösterilir.
                </div>
              )}
              {source === 'theoretical_equity' && (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  📐 Hisse opsiyon primleri <strong>Black-Scholes ile hesaplanmış teorik değerdir</strong>{' '}
                  (spot canlı · FMP{data.iv_pct != null && <> · varsayılan IV %{data.iv_pct}</>}).
                  Örnek <strong>1 hisse</strong> üzerinden; gerçekte 1 opsiyon sözleşmesi = 100 hisse.
                </div>
              )}

              {/* öğretmen-öğrenci anlatımı (yoksa tek cümlelik özete düş) */}
              {data.teaching ? (
                <Teaching t={data.teaching} />
              ) : (
                data.summary && (
                  <p className="text-sm text-gray-200 leading-relaxed mb-4">{data.summary}</p>
                )
              )}

              {/* metrikler (backend'den dinamik) */}
              {metrics.length > 0 && (
                <div className={`grid gap-2 mb-4 ${metrics.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                  {metrics.map((m, i) => (
                    <Metric key={i} label={m.label} value={metricText(m)} color={KIND_COLOR[m.kind]} />
                  ))}
                </div>
              )}

              {/* bacak tablosu */}
              <LegTable data={data} />

              {/* payoff grafiği */}
              <div className="rounded-xl border border-[#26314a] bg-[#0e0e1a] p-3 mb-2">
                <div className="text-xs text-gray-500 mb-1">
                  Vade sonu kâr/zarar (yatay: {asset} fiyatı · dikey: PnL)
                </div>
                <PayoffChart data={data} />
                <div className="flex gap-4 text-[10px] text-gray-500 mt-1">
                  <span><span className="text-[#4fc3f7]">▎</span> bugünkü fiyat</span>
                  <span><span className="text-[#a78bfa]">▎</span> strike</span>
                  <span><span className="text-[#26de81]">▎</span> kâr bölgesi</span>
                </div>
              </div>

              {showUpsell && (
                <a
                  href={UPGRADE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#a78bfa]/40 bg-gradient-to-r from-[#a78bfa]/15 to-transparent px-4 py-3 hover:from-[#a78bfa]/25 transition"
                >
                  <span className="text-sm text-gray-200">
                    🔒 <strong className="text-[#a78bfa]">Premium</strong>'da 6 strateji daha — covered
                    call, iron condor, straddle ve dahası, bugünün gerçek rakamlarıyla.
                  </span>
                  <span className="text-xs font-semibold text-[#a78bfa] whitespace-nowrap">Yükselt →</span>
                </a>
              )}

              <p className="text-[11px] text-gray-500 italic text-center mt-3">
                Sayılar gerçek piyasa verisi + deterministik hesaptan gelir (AI üretimi değil).
                Bu içerik EĞİTİM amaçlıdır, yatırım tavsiyesi değildir (SPK).
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[#26314a] bg-[#161629] p-2 text-center">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
