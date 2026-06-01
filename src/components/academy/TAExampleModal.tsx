'use client';

/**
 * Teknik Analiz "Gerçek Örnek" modalı.
 *
 * Binance/FMP'den canlı OHLC + deterministik formasyon tespiti gösterir.
 * Lightweight Charts v5 ile candlestick + EMA20 overlay + horizontal level'ler
 * + sloped trendline'lar (mini LineSeries) + teaching paneli.
 *
 * Free kullanıcılara M1 + M5L1 tadımlık üzerinden açılır; geri kalan tekniklerde
 * "🔒 Premium" upsell kancası vardır.
 */

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { apiClient, type TAExample, type TAExampleAnnotation } from '@/lib/api';

interface Props {
  technique: string;
  techniqueLabel: string;
  onClose: () => void;
  showUpsell?: boolean;
}

const ASSETS = ['BTC', 'ETH', 'SPY', 'AAPL', 'QQQ', 'NVDA'] as const;
type Asset = (typeof ASSETS)[number];

const UPGRADE_LINK = 'https://t.me/AxiomAnaliz_Bot?start=upgrade_premium';

const LEVEL_COLORS = {
  support: '#26de81',
  resistance: '#ff5c5c',
  default: '#4fc3f7',
} as const;

function formatNumber(n: number | undefined, decimals: number = 0): string {
  if (n === undefined || n === null || !isFinite(n)) return '—';
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function epochMsToTime(ms: number): UTCTimestamp {
  return Math.floor(ms / 1000) as UTCTimestamp;
}

/** Lightweight Charts v5 ile candlestick + overlay. */
function TAChart({ data }: { data: TAExample }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.bars || data.bars.length === 0) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: '#0f1320' },
        textColor: '#d1d4dc',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1c2030' },
        horzLines: { color: '#1c2030' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2a2f42',
      },
      rightPriceScale: { borderColor: '#2a2f42' },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    // Candlestick serisi (ana)
    const candleSeries: ISeriesApi<'Candlestick'> = chart.addSeries(CandlestickSeries, {
      upColor: '#26de81',
      downColor: '#ff5c5c',
      borderUpColor: '#26de81',
      borderDownColor: '#ff5c5c',
      wickUpColor: '#26de81',
      wickDownColor: '#ff5c5c',
    });
    const candleData = data.bars.map((b) => ({
      time: epochMsToTime(b.t),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
    }));
    candleSeries.setData(candleData);

    // EMA20 overlay
    const ema20 = data.indicators?.ema20;
    if (ema20 && ema20.length === data.bars.length) {
      const emaSeries = chart.addSeries(LineSeries, {
        color: '#ffd166',
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const emaPoints = data.bars
        .map((b, i) => {
          const v = ema20[i];
          return v !== null && v !== undefined
            ? { time: epochMsToTime(b.t), value: v }
            : null;
        })
        .filter((p): p is { time: UTCTimestamp; value: number } => p !== null);
      emaSeries.setData(emaPoints);
    }

    // Annotation'ları işle
    const annotations = data.annotations ?? [];
    for (const ann of annotations) {
      if (ann.type === 'level' && ann.price !== undefined) {
        const color =
          ann.side === 'support'
            ? LEVEL_COLORS.support
            : ann.side === 'resistance'
              ? LEVEL_COLORS.resistance
              : LEVEL_COLORS.default;
        candleSeries.createPriceLine({
          price: ann.price,
          color,
          lineWidth: 2,
          lineStyle: 2, // dashed
          axisLabelVisible: true,
          title: ann.label ?? '',
        });
      } else if (ann.type === 'neckline' && ann.price !== undefined) {
        candleSeries.createPriceLine({
          price: ann.price,
          color: '#ff9f43',
          lineWidth: 2,
          lineStyle: 1, // dotted
          axisLabelVisible: true,
          title: ann.label ?? 'Boyun Çizgisi',
        });
      } else if (
        ann.type === 'trendline' &&
        ann.from_i !== undefined &&
        ann.to_i !== undefined &&
        ann.from_price !== undefined &&
        ann.to_price !== undefined
      ) {
        const fromBar = data.bars[Math.max(0, Math.min(ann.from_i, data.bars.length - 1))];
        const toBar = data.bars[Math.max(0, Math.min(ann.to_i, data.bars.length - 1))];
        if (fromBar && toBar) {
          const lineSeries = chart.addSeries(LineSeries, {
            color: '#a78bfa',
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          lineSeries.setData([
            { time: epochMsToTime(fromBar.t), value: ann.from_price },
            { time: epochMsToTime(toBar.t), value: ann.to_price },
          ]);
        }
      }
    }

    chart.timeScale().fitContent();

    const resize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return <div ref={containerRef} className="w-full" style={{ height: 360 }} />;
}

function Teaching({ teaching }: { teaching: TAExample['teaching'] }) {
  if (!teaching || !teaching.steps || teaching.steps.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg border border-[#2a2f42] bg-[#161a2a] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-[#a78bfa]/20 px-2 py-0.5 text-xs text-[#a78bfa]">
          🎭 {teaching.character ?? 'Karakter'}
        </span>
        <span className="text-xs text-[#8a92a8]">Adım adım hikaye</span>
      </div>
      {teaching.intro && <p className="mb-3 text-sm text-[#d1d4dc]">{teaching.intro}</p>}
      <ol className="space-y-3">
        {teaching.steps.map((s, idx) => (
          <li key={idx} className="border-l-2 border-[#3a4060] pl-3">
            <div className="text-xs font-semibold text-[#9ca3af]">{s.title}</div>
            <p className="mt-1 text-sm text-[#d1d4dc]">{s.body}</p>
          </li>
        ))}
      </ol>
      {teaching.takeaway && (
        <div className="mt-3 rounded border border-[#3a4060] bg-[#0f1320] p-3 text-sm italic text-[#a78bfa]">
          💡 {teaching.takeaway}
        </div>
      )}
    </div>
  );
}

export function TAExampleModal({ technique, techniqueLabel, onClose, showUpsell = false }: Props) {
  const [asset, setAsset] = useState<Asset>('BTC');
  const [data, setData] = useState<TAExample | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getTAExample(technique, asset)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        if (!res.available) setError(res.error ?? 'Veri çekilemedi');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [technique, asset]);

  // ESC ile kapanma
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#2a2f42] bg-[#0f1320] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              📈 {data?.technique_name ?? techniqueLabel}
            </h2>
            <p className="mt-1 text-sm text-[#8a92a8]">
              {data?.asset_label ?? asset} · {data?.timeframe ?? '1d'}
              {data?.source && (
                <span className="ml-2 rounded bg-[#1c2030] px-2 py-0.5 text-xs">
                  {data.source === 'binance' ? '🟡 Binance' : data.source === 'fmp' ? '🔵 FMP' : '💾 Cache'}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8a92a8] hover:bg-[#1c2030] hover:text-white"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Varlık seçici */}
        <div className="mb-4 flex flex-wrap gap-2">
          {ASSETS.map((a) => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                asset === a
                  ? 'bg-[#a78bfa] text-white'
                  : 'bg-[#1c2030] text-[#8a92a8] hover:bg-[#2a2f42] hover:text-white'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Headline */}
        {data?.summary?.headline && (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              data.summary.found
                ? 'border-[#26de81]/30 bg-[#26de81]/5 text-[#26de81]'
                : 'border-[#8a92a8]/30 bg-[#1c2030] text-[#d1d4dc]'
            }`}
          >
            {data.summary.found ? '✅ ' : 'ℹ️ '}
            {data.summary.headline}
          </div>
        )}

        {/* Grafik */}
        {loading && (
          <div className="flex h-[360px] items-center justify-center rounded-lg border border-[#2a2f42] bg-[#0f1320]">
            <span className="text-sm text-[#8a92a8]">Canlı veri çekiliyor…</span>
          </div>
        )}
        {!loading && error && (
          <div className="rounded-lg border border-[#ff5c5c]/30 bg-[#ff5c5c]/5 p-4 text-sm text-[#ff5c5c]">
            ⚠️ {error}
          </div>
        )}
        {!loading && data?.available && data.bars && data.bars.length > 0 && (
          <div className="rounded-lg border border-[#2a2f42] bg-[#0f1320] p-2">
            <TAChart data={data} />
          </div>
        )}

        {/* Metrics tablosu */}
        {data?.summary?.metrics && data.summary.metrics.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-[#2a2f42]">
            <table className="w-full text-sm">
              <tbody>
                {data.summary.metrics.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-[#161a2a]' : 'bg-[#0f1320]'}>
                    <td className="px-3 py-2 text-[#8a92a8]">{m.label}</td>
                    <td className="px-3 py-2 text-right font-mono text-white">{m.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Teaching */}
        {data?.teaching && <Teaching teaching={data.teaching} />}

        {/* Free upsell kancası */}
        {showUpsell && (
          <div className="mt-4 rounded-lg border border-[#a78bfa]/30 bg-[#a78bfa]/5 p-4">
            <div className="mb-2 text-sm font-semibold text-[#a78bfa]">
              🔓 Premium'da 5 teknik daha + ileri formasyon avı
            </div>
            <p className="mb-3 text-xs text-[#8a92a8]">
              Destek/direnç sıçraması, trend çizgisi kırılımı, omuz-baş-omuz, ikili dip,
              üçgen kırılımı — her biri canlı veriyle, karakter senaryosuyla.
            </p>
            <a
              href={UPGRADE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-[#a78bfa] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9170f0]"
            >
              Yükselt →
            </a>
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-4 text-center text-xs text-[#5b6480]">
          Bu içerik EĞİTİM amaçlıdır. Yatırım tavsiyesi değildir (SPK).
        </p>
      </div>
    </div>
  );
}
