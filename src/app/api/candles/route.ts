import { NextRequest, NextResponse } from 'next/server';

/**
 * Candle (mum grafigi) API Proxy
 *
 * Kaynaklar:
 * - Binance (Kripto): Tamamen ucretsiz, tam OHLCV verisi
 * - Yahoo Finance (Hisse + Forex): Ucretsiz, tam OHLCV verisi
 *
 * Kullanim:
 * GET /api/candles?symbol=BINANCE:BTCUSDT&resolution=D
 * GET /api/candles?symbol=AAPL&resolution=60
 */

interface ChartPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Binance interval mapping
const binanceIntervals: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '240': '4h',    // 4 saat
  'D': '1d',
  'W': '1w',
  'M': '1M',
};

// Yahoo Finance interval mapping (4h desteklemedigi icin 1h'a dusuyoruz)
const yahooIntervals: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '60m',
  '240': '60m',   // Yahoo 4h desteklemiyor, 1h veriyle gostereceğiz
  'D': '1d',
  'W': '1wk',
  'M': '1mo',
};

// Yahoo range (maksimum gecmis veri)
const yahooRanges: Record<string, string> = {
  '1': '7d',
  '5': '60d',
  '15': '60d',
  '30': '60d',
  '60': '2y',
  '240': '2y',    // 4h icin 2 yil (Yahoo 60m veriden)
  'D': '5y',
  'W': '10y',
  'M': 'max',
};

// Populer BIST sembolleri (kisayol icin, prefix'siz de desteklenir)
const POPULAR_BIST = new Set([
  'ASELS', 'GARAN', 'IS', 'KCHOL', 'THYAO', 'AKBNK', 'BIMAS',
  'SASA', 'TOASO', 'EKART', 'ISCTR', 'EREGL', 'TUPRS', 'SAHOL',
  'PGSUS', 'YKBNK', 'VAKBN', 'HALKB', 'ENKAI', 'KOZAL',
]);

// Forex + BIST sembol donusumu (Yahoo formatlari)
function normalizeSymbolForYahoo(symbol: string): string {
  // Forex: OANDA:EUR_USD -> EURUSD=X
  if (symbol.startsWith('OANDA:')) {
    const pair = symbol.replace('OANDA:', '').replace('_', '');
    return `${pair}=X`;
  }
  // BIST: BIST:ASELS -> ASELS.IS (explicit prefix)
  if (symbol.startsWith('BIST:')) {
    return `${symbol.replace('BIST:', '').toUpperCase()}.IS`;
  }
  // Populer BIST: ASELS -> ASELS.IS (kisayol, prefix'siz)
  if (POPULAR_BIST.has(symbol.toUpperCase())) {
    return `${symbol.toUpperCase()}.IS`;
  }
  return symbol;
}

async function fetchBinanceCandles(
  symbol: string,
  resolution: string
): Promise<ChartPoint[]> {
  const binanceSymbol = symbol.replace('BINANCE:', '');
  const interval = binanceIntervals[resolution] || '1d';
  const limit = 1000; // Binance max limit

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 15 } });

  if (!res.ok) return [];

  const data: [number, string, string, string, string, string][] = await res.json();

  return data.map(k => ({
    time: Math.floor(k[0] / 1000), // ms -> s
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

async function fetchYahooCandles(
  symbol: string,
  resolution: string
): Promise<ChartPoint[]> {
  const yahooSymbol = normalizeSymbolForYahoo(symbol);
  const interval = yahooIntervals[resolution] || '1d';
  const range = yahooRanges[resolution] || '3mo';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 15 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const { open = [], high = [], low = [], close = [], volume = [] } = quote;

  return timestamps
    .map((t, i) => ({
      time: t,
      open: open[i] ?? 0,
      high: high[i] ?? 0,
      low: low[i] ?? 0,
      close: close[i] ?? 0,
      volume: volume[i] ?? 0,
    }))
    .filter(p => p.close > 0);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const resolution = searchParams.get('resolution') || 'D';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    let candles: ChartPoint[] = [];

    if (symbol.startsWith('BINANCE:') || symbol.startsWith('COINBASE:')) {
      candles = await fetchBinanceCandles(symbol, resolution);
    } else {
      candles = await fetchYahooCandles(symbol, resolution);
    }

    return NextResponse.json({
      symbol,
      resolution,
      candles,
      source: symbol.startsWith('BINANCE:') ? 'binance' : 'yahoo',
    });
  } catch (error) {
    console.error('Candles API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candles' },
      { status: 500 }
    );
  }
}
