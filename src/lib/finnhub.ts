/**
 * Finnhub API Client
 *
 * Ucretsiz tier: 60 istek/dakika
 * Dokumantasyon: https://finnhub.io/docs/api
 *
 * Desteklenen veriler:
 * - Hisse senedi fiyatlari (AAPL, MSFT, vb.)
 * - Kripto para fiyatlari (BINANCE:BTCUSDT, vb.)
 * - Forex (OANDA:EUR_USD, vb.)
 * - Teknik indikatorlar (RSI, MACD, SMA, EMA)
 * - Mum grafigi verileri (Candlestick)
 */

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'demo';

// Resolution tipleri (grafik zaman dilimleri)
export type Resolution = '1' | '5' | '15' | '30' | '60' | '240' | 'D' | 'W' | 'M';

export interface Quote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High of the day
  l: number;  // Low of the day
  o: number;  // Open price
  pc: number; // Previous close
  t: number;  // Timestamp
}

export interface CandleData {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps
  v: number[]; // Volumes
  s: string;   // Status: 'ok' or 'no_data'
}

export interface ChartPoint {
  time: number; // UNIX timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  t: number[];
  [key: string]: number[] | string;
}

/**
 * Anlik fiyat bilgisi al
 * Ornek: getQuote('AAPL') -> Apple hisse fiyati
 * Ornek: getQuote('BINANCE:BTCUSDT') -> Bitcoin fiyati
 */
export async function getQuote(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.c === 0) return null;
    return data as Quote;
  } catch (e) {
    console.error('Finnhub getQuote error:', e);
    return null;
  }
}

/**
 * Mum grafigi verilerini al (Yahoo Finance ve Binance proxy uzerinden)
 *
 * NOT: Finnhub ucretsiz tier candle endpointi vermiyor, bu nedenle
 * /api/candles route'u uzerinden Yahoo Finance (hisse/forex) ve
 * Binance (kripto) API'larini kullaniyoruz.
 */
export async function getCandles(
  symbol: string,
  resolution: Resolution = 'D'
): Promise<ChartPoint[]> {
  try {
    const url = `/api/candles?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.candles || [];
  } catch (e) {
    console.error('getCandles error:', e);
    return [];
  }
}

/**
 * Kripto mum grafigi verilerini al (Binance uzerinden)
 */
export async function getCryptoCandles(
  symbol: string,
  resolution: Resolution = 'D'
): Promise<ChartPoint[]> {
  return getCandles(symbol, resolution);
}

/**
 * Teknik Indikator Hesaplama Fonksiyonlari
 *
 * NOT: Finnhub ucretsiz tier indikator endpointi vermiyor.
 * Bu yuzden indikatorleri candle verisinden yerel olarak hesapliyoruz.
 */

export interface IndicatorPoint {
  time: number;
  value: number;
}

/**
 * SMA - Simple Moving Average
 * Formula: SMA = (P1 + P2 + ... + Pn) / n
 */
export function calculateSMA(candles: ChartPoint[], period: number = 20): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((s, p) => s + p.close, 0);
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }
  return result;
}

/**
 * EMA - Exponential Moving Average
 * Formula: EMA = Price * k + EMA(prev) * (1-k), k = 2/(n+1)
 */
export function calculateEMA(candles: ChartPoint[], period: number = 20): IndicatorPoint[] {
  if (candles.length < period) return [];

  const result: IndicatorPoint[] = [];
  const k = 2 / (period + 1);

  // Ilk EMA olarak SMA kullan
  const firstSlice = candles.slice(0, period);
  let ema = firstSlice.reduce((s, p) => s + p.close, 0) / period;
  result.push({ time: candles[period - 1].time, value: ema });

  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push({ time: candles[i].time, value: ema });
  }

  return result;
}

/**
 * RSI - Relative Strength Index (0-100)
 * Formula: RSI = 100 - (100 / (1 + RS)), RS = avgGain / avgLoss
 */
export function calculateRSI(candles: ChartPoint[], period: number = 14): IndicatorPoint[] {
  if (candles.length <= period) return [];

  const result: IndicatorPoint[] = [];
  const changes: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  // Ilk ortalama gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: candles[period].time,
    value: 100 - 100 / (1 + rs0),
  });

  // Sonraki degerler icin Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: candles[i + 1].time,
      value: 100 - 100 / (1 + rs),
    });
  }

  return result;
}

/**
 * Indikator hesapla (yerel)
 */
export function getTechnicalIndicator(
  candles: ChartPoint[],
  indicator: 'rsi' | 'sma' | 'ema',
  period?: number
): IndicatorPoint[] {
  const defaultPeriod = indicator === 'rsi' ? 14 : 20;
  const p = period || defaultPeriod;

  switch (indicator) {
    case 'sma': return calculateSMA(candles, p);
    case 'ema': return calculateEMA(candles, p);
    case 'rsi': return calculateRSI(candles, p);
    default: return [];
  }
}

/**
 * Kategori -> Sembol eslemeleri
 * Haber kategorisine gore ilgili grafigi gostermek icin
 */
export const CATEGORY_DEFAULT_SYMBOLS: Record<string, { symbol: string; label: string; type: 'stock' | 'crypto' }> = {
  crypto: { symbol: 'BINANCE:BTCUSDT', label: 'BTC/USDT', type: 'crypto' },
  stocks: { symbol: 'AAPL', label: 'AAPL', type: 'stock' },
  forex: { symbol: 'OANDA:EUR_USD', label: 'EUR/USD', type: 'stock' },
  economy: { symbol: 'SPY', label: 'S&P 500', type: 'stock' },
};

/**
 * Populer sembol listeleri (dropdown icin)
 */
export const POPULAR_SYMBOLS = {
  crypto: [
    { symbol: 'BINANCE:BTCUSDT', label: 'Bitcoin (BTC)' },
    { symbol: 'BINANCE:ETHUSDT', label: 'Ethereum (ETH)' },
    { symbol: 'BINANCE:SOLUSDT', label: 'Solana (SOL)' },
    { symbol: 'BINANCE:BNBUSDT', label: 'BNB' },
  ],
  stocks: [
    { symbol: 'AAPL', label: 'Apple' },
    { symbol: 'MSFT', label: 'Microsoft' },
    { symbol: 'GOOGL', label: 'Google' },
    { symbol: 'TSLA', label: 'Tesla' },
    { symbol: 'NVDA', label: 'NVIDIA' },
  ],
  forex: [
    { symbol: 'OANDA:EUR_USD', label: 'EUR/USD' },
    { symbol: 'OANDA:GBP_USD', label: 'GBP/USD' },
    { symbol: 'OANDA:USD_JPY', label: 'USD/JPY' },
    { symbol: 'OANDA:USD_TRY', label: 'USD/TRY' },
  ],
  economy: [
    { symbol: 'SPY', label: 'S&P 500' },
    { symbol: 'QQQ', label: 'NASDAQ' },
    { symbol: 'DIA', label: 'Dow Jones' },
    { symbol: 'GLD', label: 'Altin (GLD)' },
  ],
};

/**
 * DEMO MODU: Gercek API key yoksa ornek veri uretir
 * Boylece API key olmadan da sistem test edilebilir
 */
export function generateDemoCandles(basePrice: number = 100, count: number = 90): ChartPoint[] {
  const now = Math.floor(Date.now() / 1000);
  const dayInSec = 86400;
  const data: ChartPoint[] = [];

  let price = basePrice;
  for (let i = count; i > 0; i--) {
    const time = now - (i * dayInSec);
    const change = (Math.random() - 0.48) * (basePrice * 0.03);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.01);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 500000;

    data.push({ time, open, high, low, close, volume });
    price = close;
  }

  return data;
}

export function isDemoMode(): boolean {
  return !API_KEY || API_KEY === 'demo';
}
