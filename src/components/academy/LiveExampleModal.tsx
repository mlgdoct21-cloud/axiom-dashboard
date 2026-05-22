'use client';

import { useEffect, useState } from 'react';
import { apiClient, type AcademyLiveExample } from '@/lib/api';

interface Props {
  strategy: string;        // örn. 'protective-put'
  strategyLabel: string;   // başlıkta gösterilecek ad
  onClose: () => void;
}

const ASSETS = ['BTC', 'ETH'] as const;
type Asset = (typeof ASSETS)[number];

function usd(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' $';
}

/** Basit inline SVG payoff grafiği — ekstra bağımlılık yok. */
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
  const strikeX = data.strike !== undefined ? sx(data.strike) : null;
  const spotX = data.spot !== undefined ? sx(data.spot) : null;

  // PnL=0 çizgisinin üstü yeşil, altı kırmızı alan
  const areaTop = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.price).toFixed(1)},${sy(p.pnl).toFixed(1)}`).join(' ');
  const areaClose = `L${sx(pts[pts.length - 1].price).toFixed(1)},${zeroY.toFixed(1)} L${sx(pts[0].price).toFixed(1)},${zeroY.toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <clipPath id="above"><rect x="0" y="0" width={W} height={zeroY} /></clipPath>
        <clipPath id="below"><rect x="0" y={zeroY} width={W} height={H - zeroY} /></clipPath>
      </defs>
      {/* alanlar */}
      <path d={`${areaTop} ${areaClose}`} fill="#26de81" opacity="0.12" clipPath="url(#above)" />
      <path d={`${areaTop} ${areaClose}`} fill="#ff5c5c" opacity="0.12" clipPath="url(#below)" />
      {/* sıfır çizgisi */}
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#5b6480" strokeWidth="1" strokeDasharray="4 3" />
      {/* strike */}
      {strikeX !== null && (
        <line x1={strikeX} y1={padT} x2={strikeX} y2={H - padB} stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 3" />
      )}
      {/* spot */}
      {spotX !== null && (
        <line x1={spotX} y1={padT} x2={spotX} y2={H - padB} stroke="#4fc3f7" strokeWidth="1" />
      )}
      {/* payoff eğrisi */}
      <path d={line} fill="none" stroke="#e6e6f0" strokeWidth="2" />
      {/* etiketler */}
      {strikeX !== null && (
        <text x={strikeX} y={H - 6} fill="#a78bfa" fontSize="9" textAnchor="middle">strike</text>
      )}
      {spotX !== null && (
        <text x={spotX} y={padT - 2} fill="#4fc3f7" fontSize="9" textAnchor="middle">bugün</text>
      )}
    </svg>
  );
}

export default function LiveExampleModal({ strategy, strategyLabel, onClose }: Props) {
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

  const theoretical = data?.data_source === 'theoretical_fallback';

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
        <div className="flex gap-2 px-5 pt-4">
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
              {theoretical ? (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  ⚠️ Canlı opsiyon zinciri (Deribit) şu an alınamadı — gösterilen prim
                  <strong> Black-Scholes ile hesaplanmış teorik tahmindir</strong> (spot canlı).
                  Yayında gerçek piyasa primi gösterilir.
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-[#26de81]/30 bg-[#26de81]/10 px-3 py-2 text-xs text-[#26de81]">
                  ✅ Canlı Deribit opsiyon verisi · {data.instrument}
                </div>
              )}

              {/* senaryo cümlesi */}
              <p className="text-sm text-gray-200 leading-relaxed mb-4">
                Bugün <strong className="text-white">{asset} = {usd(data.spot)}</strong>.
                {' '}~{data.expiry_days} günlük, <strong className="text-white">{usd(data.strike)}</strong> kullanım
                fiyatlı bir put alırsan primi ≈ <strong className="text-white">{usd(data.premium_usd)}</strong>
                {data.iv_pct != null && <> (IV %{data.iv_pct})</>}. Bu protective put ile 1 {asset}&apos;ini
                aşağı sigortalarsın.
              </p>

              {/* metrikler */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Metric label="Max zarar" value={usd(data.max_loss_usd)} color="#ff5c5c" />
                <Metric label="Korunan taban" value={usd(data.protected_floor_usd)} color="#4fc3f7" />
                <Metric label="Yukarı başabaş" value={usd(data.breakeven_up_usd)} color="#26de81" />
              </div>

              {/* payoff grafiği */}
              <div className="rounded-xl border border-[#26314a] bg-[#0e0e1a] p-3 mb-2">
                <div className="text-xs text-gray-500 mb-1">
                  Vade sonu kâr/zarar (yatay: {asset} fiyatı · dikey: PnL)
                </div>
                <PayoffChart data={data} />
                <div className="flex gap-4 text-[10px] text-gray-500 mt-1">
                  <span><span className="text-[#4fc3f7]">▎</span> bugünkü fiyat</span>
                  <span><span className="text-[#a78bfa]">▎</span> strike</span>
                  <span>Aşağıda kayıp <strong className="text-gray-300">tabanlanır</strong>.</span>
                </div>
              </div>

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
