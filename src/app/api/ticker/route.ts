import { NextRequest, NextResponse } from 'next/server';

/**
 * Dashboard Ticker — Top 20 Cryptos + Indices + Mag7
 *
 * GET /api/ticker
 *
 * Returns live prices + 24h % change for:
 * - Top 20 cryptocurrencies (Binance)
 * - S&P 500, NASDAQ (Finnhub)
 * - Magnificent 7 (NVDA, TSLA, GOOGL, MSFT, AAPL, AMZN, META)
 *
 * Cache: 5 seconds (real-time feel)
 */

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  name: string;
  type: 'crypto' | 'index' | 'stock';
}

// Top 20 cryptos by market cap (Binance symbols)
const TOP_CRYPTOS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLusdt',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'MATICUSDT', 'SHIBUUSDT', 'LTCUSDT', 'BCHUSDT', 'XLMUSDT',
  'UNIUSDT', 'ATOMUSDT', 'ICPUSDT', 'VETUSDT', 'ARBUSDT'
];

// Magnificent 7
const MAG7 = ['NVDA', 'TSLA', 'GOOGL', 'MSFT', 'AAPL', 'AMZN', 'META'];

// Indices
const INDICES = ['^GSPC', '^IXIC']; // S&P 500, NASDAQ

async function fetchBinanceTicker(): Promise<TickerItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(TOP_CRYPTOS));
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      { next: { revalidate: 5 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((d: any) => ({
      symbol: `BINANCE:${d.symbol}`,
      price: parseFloat(d.lastPrice),
      changePercent: parseFloat(d.priceChangePercent),
      name: d.symbol.replace('USDT', ''),
      type: 'crypto' as const,
    }));
  } catch (e) {
    console.error('[ticker/binance]', e);
    return [];
  }
}

async function fetchFinnhubTicker(symbols: string[]): Promise<TickerItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`,
          { next: { revalidate: 5 } }
        );
        if (!res.ok) return null;
        const q = await res.json();
        if (!q.c || q.c === 0) return null;
        return {
          symbol: sym,
          price: q.c,
          changePercent: q.dp ?? 0,
          name: sym,
          type: null,
        };
      })
    );
    return results.filter(Boolean) as any[];
  } catch (e) {
    console.error('[ticker/finnhub]', e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const [cryptos, stocks, indices] = await Promise.all([
      fetchBinanceTicker(),
      fetchFinnhubTicker(MAG7).then(items =>
        items.map(item => ({ ...item, type: 'stock' as const }))
      ),
      fetchFinnhubTicker(INDICES).then(items =>
        items.map(item => ({ ...item, type: 'index' as const }))
      ),
    ]);

    const tickers = [
      ...cryptos,
      ...indices.map(i => ({
        ...i,
        name: i.symbol === '^GSPC' ? 'S&P 500' : 'NASDAQ',
      })),
      ...stocks,
    ];

    return NextResponse.json(
      { tickers, count: tickers.length, timestamp: Date.now() },
      { headers: { 'Cache-Control': 's-maxage=8, stale-while-revalidate=16' } }
    );
  } catch (e) {
    console.error('[ticker]', e);
    return NextResponse.json({ error: 'Failed to fetch tickers', tickers: [] }, { status: 500 });
  }
}
