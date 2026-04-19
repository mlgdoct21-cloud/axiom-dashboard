'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import {
  getCandles,
  getTechnicalIndicator,
  POPULAR_SYMBOLS,
  type ChartPoint,
  type Resolution,
} from '@/lib/finnhub';

interface PriceChartProps {
  category?: 'crypto' | 'stocks' | 'forex' | 'economy';
  defaultSymbol?: string;
  locale: 'en' | 'tr';
  height?: number;

  // Embedded mode
  embedded?: boolean;
  symbol?: string;
  resolution?: Resolution;
  indicators?: string[];
}

type IndicatorType = 'none' | 'rsi' | 'sma' | 'ema';

/**
 * Fiyata gore otomatik decimal precision hesapla
 * Kucuk fiyatlar (PEPE, SHIB) icin daha fazla decimal
 */
function getPriceFormat(price: number): { precision: number; minMove: number } {
  if (price < 0.00001) return { precision: 10, minMove: 0.0000000001 };
  if (price < 0.0001)  return { precision: 8,  minMove: 0.00000001 };
  if (price < 0.01)    return { precision: 6,  minMove: 0.000001 };
  if (price < 1)       return { precision: 4,  minMove: 0.0001 };
  if (price < 100)     return { precision: 2,  minMove: 0.01 };
  return { precision: 2, minMove: 0.01 };
}

/**
 * Fiyati insan dostu format et
 */
function formatPrice(price: number, locale: 'en' | 'tr'): string {
  const fmt = getPriceFormat(price);
  return price.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: fmt.precision,
    maximumFractionDigits: fmt.precision,
  });
}

// Otomatik yenileme araligi (ms)
const REFRESH_INTERVAL_MS = 30000; // 30 saniye

export default function PriceChart({
  category = 'crypto',
  defaultSymbol,
  locale,
  height = 400,
  embedded = false,
  symbol: externalSymbol,
  resolution: externalResolution,
  indicators: externalIndicators,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const candlesDataRef = useRef<ChartPoint[]>([]);

  const [internalSymbol, setInternalSymbol] = useState<string>(
    defaultSymbol || POPULAR_SYMBOLS[category][0].symbol
  );
  const [internalResolution, setInternalResolution] = useState<Resolution>('D');
  const [internalIndicator, setInternalIndicator] = useState<IndicatorType>('none');

  const symbol = embedded && externalSymbol ? externalSymbol : internalSymbol;
  const resolution = embedded && externalResolution ? externalResolution : internalResolution;
  const activeIndicators = embedded
    ? (externalIndicators || [])
    : (internalIndicator === 'none' ? [] : [internalIndicator]);

  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<{ value: number; percent: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    if (!embedded && !defaultSymbol) {
      setInternalSymbol(POPULAR_SYMBOLS[category][0].symbol);
    }
  }, [category, defaultSymbol, embedded]);

  // Chart oluştur
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#141425' },
        textColor: '#e0e0e0',
      },
      grid: {
        vertLines: { color: '#2a2a3e' },
        horzLines: { color: '#2a2a3e' },
      },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: '#2a2a3e',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a2a3e',
        autoScale: true,
        // Manuel olarak Y-eksen kaydirma icin scale margins
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      // Mouse ve touch kontrollerini tam aktif et
      handleScroll: {
        mouseWheel: true,           // Mouse tekerleği ile zoom
        pressedMouseMove: true,     // Sol tik sürükleme ile kaydirma (X ekseni)
        horzTouchDrag: true,        // Dokunmatik yatay kaydirma
        vertTouchDrag: true,        // Dokunmatik dikey kaydirma
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,               // X-ekseni üzerinde sürükleme ile zoom
          price: true,              // Y-ekseni üzerinde sürükleme ile zoom (yukari/asagi)
        },
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: '#4fc3f7',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // === Custom Y-ekseni kontrolleri (TradingView gibi) ===
    // 1) Chart alani: sol tik + drag -> Y pan (grab hissi)
    // 2) Fiyat ekseni: mouse wheel -> Y zoom (mumlari buyut/kucult)
    // 3) Fiyat ekseni: drag -> native axisPressedMouseMove.price ile zoom (zaten aktif)
    // 4) Cift tik -> autoScale'e don
    const container = containerRef.current;
    let isDraggingY = false;
    let lastPointerY = 0;
    let topMargin = 0.1;
    let bottomMargin = 0.2;
    const MIN_MARGIN = 0;
    const MAX_MARGIN = 0.95;
    const PAN_SENSITIVITY = 1.4;   // Daha akici hareket icin artirildi
    const ZOOM_STEP = 0.04;        // Wheel basina %4 margin degisimi
    const PRICE_AXIS_WIDTH = 70;
    const TIME_AXIS_HEIGHT = 30;

    const clampMargins = (t: number, b: number) => {
      topMargin = Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, t));
      bottomMargin = Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, b));
      chart.priceScale('right').applyOptions({
        scaleMargins: { top: topMargin, bottom: bottomMargin },
      });
    };

    const isOnPriceAxis = (e: { clientX: number; clientY: number }) => {
      const rect = container.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      return relX > rect.width - PRICE_AXIS_WIDTH && relY < rect.height - TIME_AXIS_HEIGHT;
    };

    const isOnChartArea = (e: { clientX: number; clientY: number }) => {
      const rect = container.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      return (
        relX < rect.width - PRICE_AXIS_WIDTH &&
        relY < rect.height - TIME_AXIS_HEIGHT
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!isOnChartArea(e)) return;

      isDraggingY = true;
      lastPointerY = e.clientY;
      chart.priceScale('right').applyOptions({ autoScale: false });
      container.style.cursor = 'grabbing';

      try {
        container.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingY) return;
      const dy = e.clientY - lastPointerY;
      lastPointerY = e.clientY;

      const delta = (dy / container.clientHeight) * PAN_SENSITIVITY;

      // Grab hissi: asagi suruk -> icerik asagi kaydir
      // Data asagi = topMargin buyuk, bottomMargin kucuk
      clampMargins(topMargin + delta, bottomMargin - delta);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDraggingY) return;
      isDraggingY = false;
      container.style.cursor = 'crosshair';
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    };

    // Fiyat ekseninde wheel -> Y zoom (mumlari dikey buyut/kucult)
    const onWheel = (e: WheelEvent) => {
      if (!isOnPriceAxis(e)) return;

      e.preventDefault();
      e.stopPropagation();

      chart.priceScale('right').applyOptions({ autoScale: false });

      // deltaY > 0: zoom out (margins buyur, mumlar kuculur)
      // deltaY < 0: zoom in (margins kuculur, mumlar buyur)
      const dir = e.deltaY > 0 ? 1 : -1;
      clampMargins(topMargin + dir * ZOOM_STEP, bottomMargin + dir * ZOOM_STEP);
    };

    // Cift tik -> Y autoScale reset
    const onDoubleClick = (e: MouseEvent) => {
      // Sadece chart alaninda veya fiyat ekseninde reset uygula
      const rect = container.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      if (relY > rect.height - TIME_AXIS_HEIGHT) return;

      topMargin = 0.1;
      bottomMargin = 0.2;
      chart.priceScale('right').applyOptions({
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      });
      container.style.cursor = 'crosshair';
    };

    // Dis dunyadan reset (sembol degisince loadData cagirir)
    const onResetY = () => {
      topMargin = 0.1;
      bottomMargin = 0.2;
      isDraggingY = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('dblclick', onDoubleClick);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('axiom:reset-y', onResetY);

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('dblclick', onDoubleClick);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('axiom:reset-y', onResetY);
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRefs.current.clear();
    };
  }, [height]);

  // Veri yükleme fonksiyonu (ilk yükleme + auto refresh)
  const loadData = async (isRefresh: boolean = false) => {
    if (!isRefresh) setLoading(true);
    const candles = await getCandles(symbol, resolution);

    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    candlesDataRef.current = candles;

    if (candles.length === 0) {
      setLoading(false);
      setDataSource('no_data');
      setCurrentPrice(null);
      setPriceChange(null);
      return;
    }

    // Sembol degisince priceScale autoScale'i acik olsun + margin'leri reset et
    // (Kullanici drag ile autoScale=false yapmis olabilir, eski fiyat araliginda takili kalir)
    if (!isRefresh && chartRef.current && containerRef.current) {
      chartRef.current.priceScale('right').applyOptions({
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      });
      // Closure icindeki topMargin/bottomMargin state'ini sifirla
      containerRef.current.dispatchEvent(new CustomEvent('axiom:reset-y'));
    }

    setDataSource(symbol.startsWith('BINANCE:') ? 'Binance' : 'Yahoo Finance');

    const candleData = candles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = candles.map(c => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? '#26a69a80' : '#ef535080',
    }));

    // Dinamik precision: fiyata gore decimal sayisi
    const lastPrice = candles[candles.length - 1].close;
    const priceFormat = getPriceFormat(lastPrice);

    candleSeriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: priceFormat.precision,
        minMove: priceFormat.minMove,
      },
    });

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    const last = candles[candles.length - 1];
    const first = candles[0];
    setCurrentPrice(last.close);
    setPriceChange({
      value: last.close - first.open,
      percent: ((last.close - first.open) / first.open) * 100,
    });
    setLastUpdate(Date.now());

    // Ilk yüklemede grafigi fit et, refresh'te kullanicinin zoom'unu koru
    if (!isRefresh) {
      chartRef.current?.timeScale().fitContent();
    }
    setLoading(false);
  };

  // İlk yükleme
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadData(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, resolution]);

  // Otomatik yenileme (real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(true);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, resolution]);

  // İndikatorlar
  useEffect(() => {
    if (!chartRef.current || candlesDataRef.current.length === 0) return;

    indicatorSeriesRefs.current.forEach((series) => {
      try { chartRef.current?.removeSeries(series); } catch (e) {}
    });
    indicatorSeriesRefs.current.clear();

    const supportedIndicators = ['sma', 'ema', 'rsi'];
    const colors: Record<string, string> = {
      sma: '#4fc3f7',
      ema: '#9c27b0',
      rsi: '#ff9800',
    };

    activeIndicators.forEach(ind => {
      if (!supportedIndicators.includes(ind)) return;

      const data = getTechnicalIndicator(
        candlesDataRef.current,
        ind as 'rsi' | 'sma' | 'ema'
      );
      if (data.length === 0 || !chartRef.current) return;

      const isRSI = ind === 'rsi';
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: colors[ind],
        lineWidth: 2,
        priceScaleId: isRSI ? 'rsi' : 'right',
        title: ind.toUpperCase(),
      });

      if (isRSI) {
        chartRef.current.priceScale('rsi').applyOptions({
          scaleMargins: { top: 0.7, bottom: 0.1 },
        });
      }

      lineSeries.setData(data.map(p => ({
        time: p.time as Time,
        value: p.value,
      })));

      indicatorSeriesRefs.current.set(ind, lineSeries);
    });
  }, [activeIndicators.join(','), loading]);

  const timeAgo = () => {
    const diff = Math.floor((Date.now() - lastUpdate) / 1000);
    if (diff < 5) return locale === 'tr' ? 'az once' : 'just now';
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m`;
  };

  // Embedded mod
  if (embedded) {
    return (
      <div className="flex flex-col bg-[#141425] border border-[#2a2a3e] rounded overflow-hidden">
        {(currentPrice !== null || dataSource) && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3e] bg-[#1a1a2e]">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-sm font-medium text-[#4fc3f7]">
                {symbol.replace('BINANCE:', '').replace('BIST:', '').replace('OANDA:', '').replace('_', '/')}
              </span>
              {currentPrice !== null && (
                <>
                  <span className="text-lg font-bold text-[#e0e0e0] font-mono">
                    {formatPrice(currentPrice, locale)}
                  </span>
                  {priceChange && (
                    <span className={`text-xs font-medium ${priceChange.value >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                      {priceChange.value >= 0 ? '▲' : '▼'} {priceChange.percent.toFixed(2)}%
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!loading && (
                <span className="text-[10px] text-[#8888a0]">
                  {locale === 'tr' ? 'Guncellendi' : 'Updated'}: {timeAgo()}
                </span>
              )}
              {dataSource && dataSource !== 'no_data' && (
                <span className="text-xs bg-[#26a69a]/20 text-[#26a69a] px-2 py-0.5 rounded border border-[#26a69a]/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#26a69a] rounded-full animate-pulse" />
                  {dataSource}
                </span>
              )}
              {dataSource === 'no_data' && (
                <span className="text-xs bg-[#ef5350]/20 text-[#ef5350] px-2 py-0.5 rounded border border-[#ef5350]/40">
                  {locale === 'tr' ? 'Veri yok' : 'No data'}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#141425]/80 z-10">
              <div className="text-[#4fc3f7] text-sm">
                {locale === 'tr' ? 'Yukleniyor...' : 'Loading...'}
              </div>
            </div>
          )}
          <div ref={containerRef} style={{ height: `${height}px` }} />
        </div>

        {/* Kontrol ipucu */}
        <div className="px-3 py-1.5 bg-[#1a1a2e] border-t border-[#2a2a3e] text-[10px] text-[#6a6a80] flex items-center gap-3 flex-wrap">
          <span>🖱 {locale === 'tr' ? 'Grafik Suruk: Y pan' : 'Chart Drag: Pan Y'}</span>
          <span>📏 {locale === 'tr' ? 'Fiyat Ekseni Tekerlek/Suruk: Dikey Zoom' : 'Price Axis Wheel/Drag: Vertical Zoom'}</span>
          <span>⟲ {locale === 'tr' ? 'Tekerlek: X Zoom' : 'Wheel: X Zoom'}</span>
          <span>👆👆 {locale === 'tr' ? 'Cift tik: Y reset' : 'Double-click: Reset Y'}</span>
          <button
            onClick={() => {
              if (chartRef.current) {
                chartRef.current.priceScale('right').applyOptions({
                  autoScale: true,
                  scaleMargins: { top: 0.1, bottom: 0.2 },
                });
                chartRef.current.timeScale().fitContent();
              }
            }}
            className="text-[10px] text-[#4fc3f7] hover:text-[#ff9800] transition underline"
          >
            ⟳ {locale === 'tr' ? 'Sifirla' : 'Reset'}
          </button>
          <span className="ml-auto">🔄 {locale === 'tr' ? '30sn otomatik yenileme' : 'Auto-refresh 30s'}</span>
        </div>
      </div>
    );
  }

  // Normal mod
  const resolutions: { value: Resolution; label: string }[] = [
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '60', label: '1h' },
    { value: '240', label: '4h' },
    { value: 'D', label: '1D' },
    { value: 'W', label: '1W' },
    { value: 'M', label: '1M' },
  ];

  const symbols = POPULAR_SYMBOLS[category] || POPULAR_SYMBOLS.crypto;

  return (
    <div className="flex flex-col bg-[#141425] border border-[#2a2a3e] rounded overflow-hidden">
      <div className="p-3 border-b border-[#2a2a3e] space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <select
              value={internalSymbol}
              onChange={(e) => setInternalSymbol(e.target.value)}
              className="bg-[#1a1a2e] border border-[#2a2a3e] rounded px-2 py-1 text-sm text-[#e0e0e0] focus:border-[#4fc3f7] focus:outline-none"
            >
              {symbols.map(s => (
                <option key={s.symbol} value={s.symbol}>{s.label}</option>
              ))}
            </select>
            {currentPrice !== null && (
              <>
                <span className="text-xl font-bold text-[#e0e0e0] font-mono">
                  {formatPrice(currentPrice, locale)}
                </span>
                {priceChange && (
                  <span className={`text-sm font-medium ${priceChange.value >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                    {priceChange.value >= 0 ? '▲' : '▼'} {priceChange.percent.toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
          {dataSource && dataSource !== 'no_data' && (
            <span className="text-xs bg-[#26a69a]/20 text-[#26a69a] px-2 py-0.5 rounded border border-[#26a69a]/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#26a69a] rounded-full animate-pulse" />
              {dataSource}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {resolutions.map(r => (
              <button
                key={r.value}
                onClick={() => setInternalResolution(r.value)}
                className={`px-2 py-1 rounded text-xs transition ${
                  internalResolution === r.value
                    ? 'bg-[#4fc3f7] text-[#0d0d1a] font-medium'
                    : 'bg-[#1a1a2e] text-[#8888a0] hover:bg-[#1e1e38]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[#2a2a3e]" />

          <div className="flex gap-1 items-center">
            <span className="text-xs text-[#8888a0] mr-1">
              {locale === 'tr' ? 'İndikator:' : 'Indicator:'}
            </span>
            {(['none', 'sma', 'ema', 'rsi'] as IndicatorType[]).map(ind => (
              <button
                key={ind}
                onClick={() => setInternalIndicator(ind)}
                className={`px-2 py-1 rounded text-xs transition ${
                  internalIndicator === ind
                    ? 'bg-[#ff9800] text-[#0d0d1a] font-medium'
                    : 'bg-[#1a1a2e] text-[#8888a0] hover:bg-[#1e1e38]'
                }`}
              >
                {ind === 'none' ? (locale === 'tr' ? 'Yok' : 'None') : ind.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#141425]/80 z-10">
            <div className="text-[#4fc3f7] text-sm">
              {locale === 'tr' ? 'Yukleniyor...' : 'Loading...'}
            </div>
          </div>
        )}
        <div ref={containerRef} style={{ height: `${height}px` }} />
      </div>
    </div>
  );
}
