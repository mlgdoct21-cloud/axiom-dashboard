import { NextRequest, NextResponse } from 'next/server';

/**
 * Dashboard Ticker — Top 20 Cryptos + Indices + Mag7
 *
 * GET /api/ticker
 *
 * Returns live prices + 24h % change for:
 * - Top 20 cryptocurrencies (CoinGecko — Vercel erisilebilir)
 * - S&P 500, NASDAQ (Finnhub)
 * - Magnificent 7 (NVDA, TSLA, GOOGL, MSFT, AAPL, AMZN, META)
 */

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  name: string;
  type: 'crypto' | 'index' | 'stock';
}

// Ticker yalnızca BTC + ETH gösterir; diğer kriptolar dashboard içinde başka
// yerlerde (Top Cryptos, watchlist, On-Chain) zaten var. Tek-satır banner asıl
// değeri "BTC/ETH spot + dünya endeksleri" gut check.
const TOP_CRYPTO_IDS = ['bitcoin', 'ethereum'];

const CG_ID_TO_SYMBOL: Record<string, string> = {
  'bitcoin': 'BTCUSDT',
  'ethereum': 'ETHUSDT',
};

const MAG7 = ['NVDA', 'TSLA', 'GOOGL', 'MSFT', 'AAPL', 'AMZN', 'META'];

// 12 dünya endeksi — sıralama: US → Asya → Avrupa → TR.
// NOT (2026-05-12): FMP Starter $29 plan Asya/Avrupa endekslerini 402 reddediyor
// (Ultimate $139 gerek). Bu yüzden FMP batch-quote'a önce dener, 402/boş dönerse
// Yahoo Finance fallback (`query1.finance.yahoo.com/v8/finance/chart/...`).
const INDICES = [
  '^GSPC',     // S&P 500
  '^IXIC',     // NASDAQ
  '^DJI',      // Dow Jones
  '^N225',     // Nikkei 225 (Tokyo)
  '^HSI',      // Hang Seng (Hong Kong)
  '^AXJO',     // ASX 200 (Sydney)
  '^KS11',     // KOSPI (Seoul)
  '^FTSE',     // FTSE 100 (London)
  '^GDAXI',    // DAX (Frankfurt)
  '^FCHI',     // CAC 40 (Paris)
  '^STOXX50E', // STOXX 50 (Euro broad)
  'XU100.IS',  // BIST 100 (İstanbul)
];

const INDEX_DISPLAY_NAME: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'DOW',
  '^N225': 'Nikkei',
  '^HSI': 'Hang Seng',
  '^AXJO': 'ASX 200',
  '^KS11': 'KOSPI',
  '^FTSE': 'FTSE 100',
  '^GDAXI': 'DAX',
  '^FCHI': 'CAC 40',
  '^STOXX50E': 'STOXX 50',
  'XU100.IS': 'BIST 100',
};

async function fetchCoinGeckoTicker(): Promise<TickerItem[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${TOP_CRYPTO_IDS.join(',')}&order=market_cap_desc&sparkline=false`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error('[ticker/coingecko] status', res.status);
      return [];
    }
    const data: Array<{
      id: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
    }> = await res.json();

    return data.map(coin => ({
      symbol: `BINANCE:${CG_ID_TO_SYMBOL[coin.id] ?? coin.id.toUpperCase() + 'USDT'}`,
      price: coin.current_price,
      changePercent: coin.price_change_percentage_24h ?? 0,
      name: (CG_ID_TO_SYMBOL[coin.id] ?? '').replace('USDT', '') || coin.name,
      type: 'crypto' as const,
    }));
  } catch (e) {
    console.error('[ticker/coingecko]', e);
    return [];
  }
}

// FMP parallel single-symbol calls (stable API)
async function fetchStocksTicker(symbols: string[]): Promise<TickerItem[]> {
  if (symbols.length === 0) return [];

  const fmpKey = process.env.FMP_API_KEY;
  if (fmpKey) {
    const results = await Promise.all(
      symbols.map(async sym => {
        try {
          const res = await fetch(
            `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(sym)}&apikey=${fmpKey}`,
            { cache: 'no-store', signal: AbortSignal.timeout(6000) }
          );
          if (!res.ok) return null;
          const data: Array<{ symbol: string; price: number; changePercentage: number }> = await res.json();
          const item = data[0];
          if (!item || item.price <= 0) return null;
          return { symbol: item.symbol, price: item.price, changePercent: item.changePercentage ?? 0, name: item.symbol, type: null as any };
        } catch { return null; }
      })
    );
    const fmpItems = results.filter(Boolean) as TickerItem[];
    if (fmpItems.length > 0) return fmpItems;
  }

  // Fallback: Finnhub tek tek
  const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return [];
  const fallback = await Promise.all(
    symbols.map(async sym => {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
        if (!res.ok) return null;
        const q = await res.json();
        if (!q.c || q.c === 0) return null;
        return { symbol: sym, price: q.c, changePercent: q.dp ?? 0, name: sym, type: null };
      } catch { return null; }
    })
  );
  return fallback.filter(Boolean) as any[];
}

// Yahoo Finance v8 chart endpoint — public, key gerekmiyor; Asya/Avrupa
// endekslerini açıyor (^N225/^HSI/^GDAXI/^FCHI vb. FMP Starter'da 402 dönüyor).
// Vercel serverless'tan erişilebilir; Railway'de yfinance lib bloklu olabilir
// ama bu doğrudan HTTPS fetch, server-side runtime'a bağımlılığı yok.
async function fetchYahooQuote(symbol: string): Promise<TickerItem | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 AxiomDashboard/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta?.regularMarketPrice;
    const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;
    if (typeof price !== 'number' || typeof prevClose !== 'number' || prevClose <= 0) return null;
    const changePercent = ((price - prevClose) / prevClose) * 100;
    return {
      symbol,
      price,
      changePercent,
      name: symbol,
      type: 'index' as const,
    };
  } catch {
    return null;
  }
}

// FMP /stable/batch-quote — Starter $29 planında US endekslerini (^GSPC/^IXIC/^DJI)
// karşılıyor; Asya/Avrupa için 402 dönüyor (Ultimate $139 gerek). Bu yüzden:
// 1) FMP batch-quote'a tek call dene — dönen sembollerle başla
// 2) Eksik sembolleri Yahoo Finance fallback ile paralel doldur
async function fetchIndicesBulk(symbols: string[]): Promise<TickerItem[]> {
  if (symbols.length === 0) return [];

  const fmpKey = process.env.FMP_API_KEY;
  const fmpResolved = new Map<string, TickerItem>();

  if (fmpKey) {
    try {
      const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${encodeURIComponent(symbols.join(','))}&apikey=${fmpKey}`;
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data: Array<{ symbol: string; price: number; changePercentage: number }> = await res.json();
        if (Array.isArray(data)) {
          for (const it of data) {
            if (it && it.price > 0) {
              fmpResolved.set(it.symbol, {
                symbol: it.symbol,
                price: it.price,
                changePercent: it.changePercentage ?? 0,
                name: it.symbol,
                type: 'index' as const,
              });
            }
          }
        }
      }
    } catch {
      // sessizce Yahoo fallback'ine düş
    }
  }

  // FMP'den dönmeyen sembolleri Yahoo'dan paralel çek
  const missing = symbols.filter(s => !fmpResolved.has(s));
  const yahooResults = missing.length > 0
    ? (await Promise.all(missing.map(fetchYahooQuote))).filter((x): x is TickerItem => x !== null)
    : [];

  return [...fmpResolved.values(), ...yahooResults];
}

export async function GET(request: NextRequest) {
  try {
    const [cryptos, stocks, indices] = await Promise.all([
      fetchCoinGeckoTicker(),
      fetchStocksTicker(MAG7).then(items =>
        items.map(item => ({ ...item, type: 'stock' as const }))
      ),
      fetchIndicesBulk(INDICES),
    ]);

    // Tutarlı sırayla göster: US → UK → Asya → Avrupa → TR
    const orderedIndices = [...indices].sort(
      (a, b) => INDICES.indexOf(a.symbol) - INDICES.indexOf(b.symbol),
    );

    const tickers = [
      ...cryptos,
      ...orderedIndices.map(i => ({
        ...i,
        name: INDEX_DISPLAY_NAME[i.symbol] ?? i.symbol,
      })),
      ...stocks,
    ];

    const cacheHeader = tickers.length > 0
      ? 's-maxage=10, stale-while-revalidate=20'
      : 'no-store, no-cache, must-revalidate';

    return NextResponse.json(
      { tickers, count: tickers.length, timestamp: Date.now() },
      { headers: { 'Cache-Control': cacheHeader } }
    );
  } catch (e) {
    console.error('[ticker]', e);
    return NextResponse.json({ error: 'Failed to fetch tickers', tickers: [] }, { status: 500 });
  }
}
