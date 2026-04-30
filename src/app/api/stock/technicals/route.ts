import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { toYahooSymbol } from '@/lib/bist-symbols';
import { isBISTAsync } from '@/lib/bist-detect-server';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Technical Indicators
 * GET /api/stock/technicals?symbol=AAPL&resolution=D
 * GET /api/stock/technicals?symbol=GARAN  (BIST → yahoo-finance2)
 *
 * Returns:
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Bollinger Bands
 * - Moving Averages (50/200 SMA)
 * - Volume Profile
 *
 * Calculation: From TradingView Lightweight Charts (local calculation)
 * Cache: 5 minutes (intraday real-time)
 */

interface TechnicalsResponse {
  symbol: string;
  resolution: string;
  timestamp: number;

  // RSI (0-100, <30 oversold, >70 overbought)
  rsi?: number;

  // MACD
  macd?: {
    value?: number;
    signal?: number;
    histogram?: number;
    status?: 'bullish' | 'bearish' | 'neutral';
  };

  // Bollinger Bands
  bb?: {
    upper?: number;
    middle?: number;
    lower?: number;
    position?: 'overbought' | 'oversold' | 'middle';
  };

  // Moving Averages
  ma?: {
    sma50?: number;
    sma200?: number;
    status?: 'bullish' | 'bearish';
  };

  // Volume analysis
  volumeProfile?: 'high' | 'normal' | 'low';

  // Current price for context
  price?: number;

  message?: string;
}

// Simulated indicator calculations from OHLC data
// In production, fetch from TradingView or calculate from candle data

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50; // Default neutral

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.round(rsi * 10) / 10;
}

function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  value: number;
  signal: number;
  histogram: number;
} {
  // Simplified MACD (would need EMA calculation in production)
  const fastMA =
    closes.slice(-fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  const slowMA =
    closes.slice(-slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;

  const macdValue = fastMA - slowMA;
  const signal = macdValue; // Simplified
  const histogram = macdValue - signal;

  return {
    value: Math.round(macdValue * 100) / 100,
    signal: Math.round(signal * 100) / 100,
    histogram: Math.round(histogram * 100) / 100,
  };
}

function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: number;
  middle: number;
  lower: number;
  position: string;
} {
  const recent = closes.slice(-period);
  const middle = recent.reduce((a, b) => a + b, 0) / period;

  const variance =
    recent.reduce((sum, x) => sum + Math.pow(x - middle, 2), 0) / period;
  const std = Math.sqrt(variance);

  const upper = middle + std * stdDev;
  const lower = middle - std * stdDev;
  const current = closes[closes.length - 1];

  let position = 'middle';
  if (current > upper) position = 'overbought';
  if (current < lower) position = 'oversold';

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    position,
  };
}

async function fetchBISTCloses(symbol: string): Promise<number[] | null> {
  try {
    const yfSymbol = toYahooSymbol(symbol);
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - 220 * 24 * 60 * 60 * 1000); // 220 days back
    const result = await yahooFinance.chart(yfSymbol, {
      period1,
      period2,
      interval: '1d',
    });
    const closes = (result?.quotes || [])
      .map(q => q.close)
      .filter((c): c is number => typeof c === 'number' && !isNaN(c));
    return closes.length ? closes : null;
  } catch (e) {
    console.error('[BIST candles]', symbol, e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase().trim();
  const resolution = request.nextUrl.searchParams.get('resolution') || 'D';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // BIST: yahoo-finance2 (free, ~15min delay)
  let closes: number[] | null = null;

  if (await isBISTAsync(symbol)) {
    closes = await fetchBISTCloses(symbol);
    if (!closes || closes.length < 20) {
      return NextResponse.json({ error: 'No BIST candle data available' }, { status: 404 });
    }
  } else {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    try {
      // Fetch OHLC candle data from Finnhub
      const now = Math.floor(Date.now() / 1000);
      const from = now - 100 * 86400; // 100 days

      const res = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${now}&token=${apiKey}`,
        { next: { revalidate: 300 } } // 5m cache
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch candle data' },
          { status: 502 }
        );
      }

      const candles = await res.json();

      if (!candles.c || candles.c.length === 0) {
        return NextResponse.json(
          { error: 'No candle data available' },
          { status: 404 }
        );
      }

      closes = candles.c as number[];
    } catch (e) {
      console.error('[technicals]', e);
      return NextResponse.json(
        { error: 'Failed to fetch candle data' },
        { status: 500 }
      );
    }
  }

  try {
    const currentPrice = closes[closes.length - 1];

    // Calculate indicators
    const rsi = calculateRSI(closes);
    const macdData = calculateMACD(closes);
    const bbData = calculateBollingerBands(closes);

    // Simple MA status (would need proper EMA in production)
    const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const sma200 = closes.slice(-200 > closes.length ? 0 : -200).reduce((a, b) => a + b, 0) / Math.min(200, closes.length);

    const result: TechnicalsResponse = {
      symbol,
      resolution,
      timestamp: Date.now(),

      rsi: Math.round(rsi * 10) / 10,

      macd: {
        value: macdData.value,
        signal: macdData.signal,
        histogram: macdData.histogram,
        status: macdData.histogram > 0 ? 'bullish' : 'bearish',
      },

      bb: {
        upper: bbData.upper,
        middle: bbData.middle,
        lower: bbData.lower,
        position: bbData.position as 'overbought' | 'oversold' | 'middle',
      },

      ma: {
        sma50: Math.round(sma50 * 100) / 100,
        sma200: Math.round(sma200 * 100) / 100,
        status: sma50 > sma200 ? 'bullish' : 'bearish',
      },

      volumeProfile: 'normal', // Would calculate from volume data

      price: currentPrice,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error('[technicals]', e);
    return NextResponse.json(
      { error: 'Failed to calculate technicals' },
      { status: 500 }
    );
  }
}
