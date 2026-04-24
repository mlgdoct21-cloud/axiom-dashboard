'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
  type AutoscaleInfo,
} from 'lightweight-charts';
import {
  getCandles,
  getTechnicalIndicator,
  calculateMACD,
  calculateBollinger,
  calculateStochastic,
  calculateATR,
  calculateFibonacci,
  calculateSupportResistance,
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
  // Tek-seri indikatörler (SMA, EMA, RSI, ATR) için map<key, series>
  // Çoklu-seri indikatörler (MACD, Bollinger, Stochastic) için key'ler:
  //   "macd:line", "macd:signal", "macd:hist"
  //   "bollinger:upper", "bollinger:middle", "bollinger:lower"
  //   "stochastic:k", "stochastic:d"
  const indicatorSeriesRefs = useRef<
    Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>
  >(new Map());
  // Fibonacci priceLine'ları — candle series üzerinde yatay çizgiler
  const fibLinesRef = useRef<IPriceLine[]>([]);
  // S/R priceLine'ları (yatay destek/direnç)
  const srLinesRef = useRef<IPriceLine[]>([]);
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
      // Mouse ve touch kontrolleri (TradingView tarzı):
      //   - Chart body wheel → X zoom (mumlar kalınlaşır/incelir, CUSTOM)
      //   - Chart body click-drag → X pan (library-native pressedMouseMove)
      //   - Fiyat ekseni wheel → Y zoom (CUSTOM — scaleMargins)
      //   - Fiyat ekseni drag → Y zoom (library-native axisPressedMouseMove)
      //
      // NOT: handleScale.mouseWheel=false — library'nin global wheel handler'i
      // fiyat ekseni uzerindeki wheel'i de X-zoom yaptigi icin custom handler'la
      // mum kaydirma fiyat eksenine sicradiginda bozuluyor. Custom onWheel'de
      // konuma gore ayirt edip dogru zoom'u uyguluyoruz.
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,     // Click-drag chart body → X pan
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,               // Zaman ekseni drag → X zoom
          price: true,              // Fiyat ekseni drag → Y zoom
        },
        mouseWheel: false,          // Custom onWheel handler yonetir
        pinch: true,
      },
    });

    // priceZoom: margin'ler sinira geldikten sonra fiyat araligini daraltarak
    // mumlari daha da buyutuyor. 1.0 = dogal, <1 = buyutulmus, >1 = kuculmus.
    let priceZoom = 1.0;
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      autoscaleInfoProvider: (baseImpl: () => AutoscaleInfo | null) => {
        const base = baseImpl();
        if (!base?.priceRange) return base;
        const { minValue, maxValue } = base.priceRange;
        const mid = (minValue + maxValue) / 2;
        const half = (maxValue - minValue) / 2;
        return {
          ...base,
          priceRange: {
            minValue: mid - half * priceZoom,
            maxValue: mid + half * priceZoom,
          },
        };
      },
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

    // === Custom kontroller (TradingView gibi) ===
    // 1) Chart alaninda wheel -> X pan (mumlar saga/sola kayar)
    // 2) Chart alaninda click-drag -> X pan (library: pressedMouseMove=true)
    // 3) Fiyat ekseni wheel -> Y zoom (mumlari dikey buyut/kucult)
    // 4) Fiyat ekseni drag -> Y zoom (library: axisPressedMouseMove.price=true)
    // 5) Cift tik -> autoScale reset
    const container = containerRef.current;
    let topMargin = 0.1;
    let bottomMargin = 0.2;
    const MIN_MARGIN = 0;
    const MAX_MARGIN = 0.99;
    const ZOOM_STEP = 0.12;        // Wheel basina %12 margin degisimi (genis amplitud)
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

    // NOT: Chart body click-drag = X pan (library'nin pressedMouseMove ayarı
    // handler ediyor). Burada custom pointer handler YOK — önceden Y-pan
    // yapıyordu, kullanıcı X-pan istediği için kaldırıldı.

    // Wheel davranışı (hepsi custom, library handleScale.mouseWheel=false):
    //   - Fiyat ekseninde: Y zoom → scaleMargins top+bottom artir/azaltir
    //   - Chart gövdesinde/zaman ekseninde: X zoom → visibleLogicalRange daralt/genislet
    //     (merkez: fare pozisyonu, mumlar kalinlasir/incelir — TradingView gibi)
    const X_ZOOM_FACTOR = 0.1; // Wheel basina %10 X zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isOnPriceAxis(e)) {
        // Fiyat ekseni → Y zoom
        const dir = e.deltaY > 0 ? 1 : -1;
        const atMin = topMargin <= MIN_MARGIN + 1e-6 && bottomMargin <= MIN_MARGIN + 1e-6;
        const atMax = topMargin >= MAX_MARGIN - 1e-6 && bottomMargin >= MAX_MARGIN - 1e-6;

        // Margin sinirina gelindiyse priceZoom ile fiyat araligini daralt/genislet
        // (mumlar margin 0'in otesinde de buyumeye/kuculmeye devam eder)
        if (dir < 0 && atMin) {
          priceZoom = Math.max(0.02, priceZoom * 0.85);
          chart.priceScale('right').applyOptions({ autoScale: true });
        } else if (dir > 0 && atMax) {
          priceZoom = Math.min(50, priceZoom / 0.85);
          chart.priceScale('right').applyOptions({ autoScale: true });
        } else {
          chart.priceScale('right').applyOptions({ autoScale: false });
          clampMargins(topMargin + dir * ZOOM_STEP, bottomMargin + dir * ZOOM_STEP);
        }
        return;
      }

      // Chart body/zaman ekseni → X zoom (mum genisligi)
      const ts = chart.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (!range) return;
      const from = range.from as number;
      const to = range.to as number;
      const span = to - from;
      if (span <= 0) return;

      // Zoom merkezi: fare altindaki mantiksal pozisyon
      const rect = container.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const chartWidth = rect.width - PRICE_AXIS_WIDTH;
      const ratio = Math.max(0, Math.min(1, relX / chartWidth));
      const anchor = from + span * ratio;

      const factor = e.deltaY > 0 ? (1 + X_ZOOM_FACTOR) : (1 - X_ZOOM_FACTOR);
      const newSpan = Math.max(5, Math.min(10000, span * factor));
      ts.setVisibleLogicalRange({
        from: anchor - (anchor - from) * (newSpan / span),
        to:   anchor + (to - anchor) * (newSpan / span),
      });
    };

    // Cift tik -> Y autoScale reset
    const onDoubleClick = (e: MouseEvent) => {
      // Sadece chart alaninda veya fiyat ekseninde reset uygula
      const rect = container.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      if (relY > rect.height - TIME_AXIS_HEIGHT) return;

      topMargin = 0.1;
      bottomMargin = 0.2;
      priceZoom = 1.0;
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
      priceZoom = 1.0;
    };

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
    const chart = chartRef.current;
    if (!chart || candlesDataRef.current.length === 0) return;

    // Eski indikatörleri temizle
    indicatorSeriesRefs.current.forEach((series) => {
      try { chart.removeSeries(series); } catch {}
    });
    indicatorSeriesRefs.current.clear();

    // Eski Fibonacci çizgilerini + marker'ları temizle
    const candleSeries = candleSeriesRef.current;
    fibLinesRef.current.forEach(line => {
      try { candleSeries?.removePriceLine(line); } catch {}
    });
    fibLinesRef.current = [];
    // Eski S/R çizgilerini temizle
    srLinesRef.current.forEach(line => {
      try { candleSeries?.removePriceLine(line); } catch {}
    });
    srLinesRef.current = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = candleSeries as any;
      if (s && typeof s.setMarkers === 'function') s.setMarkers([]);
    } catch {}

    // Volume varsayılan görünür; kullanıcı 'volume' seçtiyse görünür, seçmediyse
    // volumeSeriesRef'i gizle (TradingView hesitasyonu: volume her zaman altta
    // görünsün isterseniz bu koşulu kaldırın).
    if (volumeSeriesRef.current) {
      const volumeVisible = activeIndicators.includes('volume') || activeIndicators.length === 0;
      volumeSeriesRef.current.applyOptions({ visible: volumeVisible });
    }

    const candles = candlesDataRef.current;

    activeIndicators.forEach(ind => {
      switch (ind) {
        case 'sma': {
          const data = getTechnicalIndicator(candles, 'sma');
          if (data.length === 0) return;
          const s = chart.addSeries(LineSeries, {
            color: '#4fc3f7',
            lineWidth: 2,
            priceScaleId: 'right',
            title: 'SMA(20)',
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRefs.current.set('sma', s);
          return;
        }
        case 'ema': {
          const data = getTechnicalIndicator(candles, 'ema');
          if (data.length === 0) return;
          const s = chart.addSeries(LineSeries, {
            color: '#9c27b0',
            lineWidth: 2,
            priceScaleId: 'right',
            title: 'EMA(20)',
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRefs.current.set('ema', s);
          return;
        }
        case 'rsi': {
          const data = getTechnicalIndicator(candles, 'rsi');
          if (data.length === 0) return;
          const s = chart.addSeries(LineSeries, {
            color: '#ff9800',
            lineWidth: 2,
            priceScaleId: 'rsi',
            title: 'RSI(14)',
          });
          chart.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.75, bottom: 0 },
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRefs.current.set('rsi', s);
          return;
        }
        case 'macd': {
          const data = calculateMACD(candles);
          if (data.length === 0) return;
          const macdLine = chart.addSeries(LineSeries, {
            color: '#4fc3f7',
            lineWidth: 2,
            priceScaleId: 'macd',
            title: 'MACD',
          });
          const signalLine = chart.addSeries(LineSeries, {
            color: '#ff9800',
            lineWidth: 2,
            priceScaleId: 'macd',
            title: 'Signal',
          });
          const hist = chart.addSeries(HistogramSeries, {
            priceScaleId: 'macd',
            title: 'Hist',
          });
          chart.priceScale('macd').applyOptions({
            scaleMargins: { top: 0.75, bottom: 0 },
          });
          macdLine.setData(data.map(p => ({ time: p.time as Time, value: p.macd })));
          signalLine.setData(data.map(p => ({ time: p.time as Time, value: p.signal })));
          hist.setData(data.map(p => ({
            time: p.time as Time,
            value: p.histogram,
            color: p.histogram >= 0 ? '#26a69a80' : '#ef535080',
          })));
          indicatorSeriesRefs.current.set('macd:line', macdLine);
          indicatorSeriesRefs.current.set('macd:signal', signalLine);
          indicatorSeriesRefs.current.set('macd:hist', hist);
          return;
        }
        case 'bollinger': {
          const data = calculateBollinger(candles);
          if (data.length === 0) return;
          const upper = chart.addSeries(LineSeries, {
            color: '#e57373',
            lineWidth: 1,
            priceScaleId: 'right',
            title: 'BB Upper',
          });
          const middle = chart.addSeries(LineSeries, {
            color: '#4fc3f7',
            lineWidth: 1,
            priceScaleId: 'right',
            title: 'BB Mid',
          });
          const lower = chart.addSeries(LineSeries, {
            color: '#e57373',
            lineWidth: 1,
            priceScaleId: 'right',
            title: 'BB Lower',
          });
          upper.setData(data.map(p => ({ time: p.time as Time, value: p.upper })));
          middle.setData(data.map(p => ({ time: p.time as Time, value: p.middle })));
          lower.setData(data.map(p => ({ time: p.time as Time, value: p.lower })));
          indicatorSeriesRefs.current.set('bollinger:upper', upper);
          indicatorSeriesRefs.current.set('bollinger:middle', middle);
          indicatorSeriesRefs.current.set('bollinger:lower', lower);
          return;
        }
        case 'stochastic': {
          const data = calculateStochastic(candles);
          if (data.length === 0) return;
          const kLine = chart.addSeries(LineSeries, {
            color: '#4fc3f7',
            lineWidth: 2,
            priceScaleId: 'stoch',
            title: '%K',
          });
          const dLine = chart.addSeries(LineSeries, {
            color: '#ff9800',
            lineWidth: 2,
            priceScaleId: 'stoch',
            title: '%D',
          });
          chart.priceScale('stoch').applyOptions({
            scaleMargins: { top: 0.75, bottom: 0 },
          });
          kLine.setData(data.map(p => ({ time: p.time as Time, value: p.k })));
          dLine.setData(data.map(p => ({ time: p.time as Time, value: p.d })));
          indicatorSeriesRefs.current.set('stochastic:k', kLine);
          indicatorSeriesRefs.current.set('stochastic:d', dLine);
          return;
        }
        case 'atr': {
          const data = calculateATR(candles);
          if (data.length === 0) return;
          const s = chart.addSeries(LineSeries, {
            color: '#ba68c8',
            lineWidth: 2,
            priceScaleId: 'atr',
            title: 'ATR(14)',
          });
          chart.priceScale('atr').applyOptions({
            scaleMargins: { top: 0.75, bottom: 0 },
          });
          s.setData(data.map(p => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRefs.current.set('atr', s);
          return;
        }
        case 'fibonacci': {
          if (!candleSeries) return;
          const fib = calculateFibonacci(candles);
          if (!fib) return;

          // 1) Yatay retracement seviyeleri
          fib.levels.forEach(l => {
            const line = candleSeries.createPriceLine({
              price: l.price,
              color: l.color,
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `Fib ${l.label}`,
            });
            fibLinesRef.current.push(line);
          });

          // 2) Swing anchor trend çizgisi: High → Low'u diagonal bir
          //    line series ile çiz (kullanıcı hangi mumlardan hesaplandığını
          //    görsün). 'fib_trend' ayrı priceScaleId kullanmıyor, right axis.
          const trendSeries = chart.addSeries(LineSeries, {
            color: '#ffeb3b',
            lineWidth: 2,
            lineStyle: 0, // Solid
            priceScaleId: 'right',
            lastValueVisible: false,
            priceLineVisible: false,
            title: 'Fib Swing',
            crosshairMarkerVisible: false,
          });
          const trendPoints = [
            { time: fib.highTime, price: fib.highPrice },
            { time: fib.lowTime, price: fib.lowPrice },
          ].sort((a, b) => a.time - b.time);
          trendSeries.setData(trendPoints.map(p => ({
            time: p.time as Time,
            value: p.price,
          })));
          indicatorSeriesRefs.current.set('fibonacci:trend', trendSeries);

          // 3) Swing anchor markerlar: H (high) ve L (low) mum üzerinde
          //    görünsün ki kullanıcı anchor noktasını net görsün.
          try {
            const markers = [
              {
                time: fib.highTime as Time,
                position: 'aboveBar' as const,
                color: '#ffeb3b',
                shape: 'arrowDown' as const,
                text: `H ${fib.highPrice.toFixed(2)}`,
              },
              {
                time: fib.lowTime as Time,
                position: 'belowBar' as const,
                color: '#ffeb3b',
                shape: 'arrowUp' as const,
                text: `L ${fib.lowPrice.toFixed(2)}`,
              },
            ].sort((a, b) =>
              ((a.time as number) - (b.time as number))
            );
            // Lightweight-charts v5: markers API series üzerinden
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const series = candleSeries as any;
            if (typeof series.setMarkers === 'function') {
              series.setMarkers(markers);
            }
          } catch {}
          return;
        }
        case 'sr': {
          if (!candleSeries) return;
          const sr = calculateSupportResistance(candles);
          if (!sr) return;

          // 1) Destek çizgileri (yeşil, kesikli)
          sr.supports.forEach((lvl, i) => {
            const line = candleSeries.createPriceLine({
              price: lvl.price,
              color: '#26a69a',
              lineWidth: lvl.touches >= 3 ? 2 : 1,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: `S${i + 1}${lvl.touches >= 2 ? ` (${lvl.touches}×)` : ''}`,
            });
            srLinesRef.current.push(line);
          });

          // 2) Direnç çizgileri (kırmızı, kesikli)
          sr.resistances.forEach((lvl, i) => {
            const line = candleSeries.createPriceLine({
              price: lvl.price,
              color: '#ef5350',
              lineWidth: lvl.touches >= 3 ? 2 : 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `R${i + 1}${lvl.touches >= 2 ? ` (${lvl.touches}×)` : ''}`,
            });
            srLinesRef.current.push(line);
          });

          // 3) Trend çizgisi (diagonal LineSeries, up=yeşil / down=kırmızı)
          if (sr.trendline) {
            const t = sr.trendline;
            const color = t.direction === 'up' ? '#26a69a' : '#ef5350';
            const trendSeries = chart.addSeries(LineSeries, {
              color,
              lineWidth: 2,
              lineStyle: 0, // Solid
              priceScaleId: 'right',
              lastValueVisible: false,
              priceLineVisible: false,
              title: t.direction === 'up' ? 'Trend ↑' : 'Trend ↓',
              crosshairMarkerVisible: false,
            });
            const points = [
              { time: t.startTime, value: t.startPrice },
              { time: t.endTime,   value: t.endPrice   },
            ].sort((a, b) => a.time - b.time);
            trendSeries.setData(points.map(p => ({ time: p.time as Time, value: p.value })));
            indicatorSeriesRefs.current.set('sr:trend', trendSeries);
          }
          return;
        }
        default:
          return;
      }
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
          <span>🖱 {locale === 'tr' ? 'Grafik Tekerlek: X Zoom (mumlar kalinlasir/incelir)' : 'Chart Wheel: X Zoom (candles thicken/thin)'}</span>
          <span>✋ {locale === 'tr' ? 'Grafik Suruk: Komple Saga/Sola Kaydir' : 'Chart Drag: Pan Left/Right'}</span>
          <span>📏 {locale === 'tr' ? 'Fiyat Ekseni Tekerlek/Suruk: Y Zoom' : 'Price Axis Wheel/Drag: Y Zoom'}</span>
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
