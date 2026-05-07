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

// Top 20 cryptos — CoinGecko IDs
const TOP_CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'binancecoin', 'ripple', 'solana',
  'cardano', 'dogecoin', 'avalanche-2', 'polkadot', 'chainlink',
  'matic-network', 'shiba-inu', 'litecoin', 'bitcoin-cash', 'stellar',
  'uniswap', 'cosmos', 'internet-computer', 'vechain', 'arbitrum',
];

const CG_ID_TO_SYMBOL: Record<string, string> = {
  'bitcoin': 'BTCUSDT',
  'ethereum': 'ETHUSDT',
  'binancecoin': 'BNBUSDT',
  'ripple': 'XRPUSDT',
  'solana': 'SOLUSDT',
  'cardano': 'ADAUSDT',
  'dogecoin': 'DOGEUSDT',
  'avalanche-2': 'AVAXUSDT',
  'polkadot': 'DOTUSDT',
  'chainlink': 'LINKUSDT',
  'matic-network': 'MATICUSDT',
  'shiba-inu': 'SHIBUSDT',
  'litecoin': 'LTCUSDT',
  'bitcoin-cash': 'BCHUSDT',
  'stellar': 'XLMUSDT',
  'uniswap': 'UNIUSDT',
  'cosmos': 'ATOMUSDT',
  'internet-computer': 'ICPUSDT',
  'vechain': 'VETUSDT',
  'arbitrum': 'ARBUSDT',
};

const MAG7 = ['NVDA', 'TSLA', 'GOOGL', 'MSFT', 'AAPL', 'AMZN', 'META'];

// 8 dünya endexi — sıralama: US → UK → Asya → Avrupa → TR.
// NOT (2026-05-07): per-symbol /stable/quote ^GDAXI/^FCHI/XU100.IS için "Special
// Endpoint" verirken /stable/batch-quote bulk endpoint hepsini açıyor — bu yüzden
// tek call ile çekiyoruz (tek HTTP, daha az latency).
const INDICES = ['^GSPC', '^IXIC', '^FTSE', '^HSI', '^N225', '^GDAXI', '^FCHI', 'XU100.IS'];

const INDEX_DISPLAY_NAME: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^HSI': 'Hang Seng',
  '^N225': 'Nikkei 225',
  '^FTSE': 'FTSE 100',
  '^GDAXI': 'DAX',
  '^FCHI': 'CAC 40',
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

// FMP /stable/batch-quote — ^GDAXI/^FCHI/XU100.IS gibi Premium-restricted
// sembolleri açıyor (per-symbol /stable/quote bunlara "Special Endpoint" diyor
// ama bulk endpoint serbest, 2026-05-07'de doğrulandı).
async function fetchIndicesBulk(symbols: string[]): Promise<TickerItem[]> {
  if (symbols.length === 0) return [];
  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) return [];
  try {
    const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${encodeURIComponent(symbols.join(','))}&apikey=${fmpKey}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data: Array<{ symbol: string; price: number; changePercentage: number }> = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter(it => it && it.price > 0)
      .map(it => ({
        symbol: it.symbol,
        price: it.price,
        changePercent: it.changePercentage ?? 0,
        name: it.symbol,
        type: 'index' as const,
      }));
  } catch {
    return [];
  }
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
