import { NextRequest, NextResponse } from 'next/server';

/**
 * Bulk Quote API — canli fiyat + 24h % degisim
 *
 * GET /api/quote?symbols=BINANCE:BTCUSDT,AAPL,OANDA:EUR_USD
 *
 * Kaynaklar:
 *  - CoinGecko: /coins/markets (crypto, ucretsiz, Vercel IP'lerinden erisilebilir)
 *  - Finnhub: /quote (stocks/forex/BIST)
 */

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
  source: 'binance' | 'yahoo';
}

// Binance symbol → CoinGecko ID
const BINANCE_TO_CG: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  BNBUSDT: 'binancecoin',
  XRPUSDT: 'ripple',
  SOLUSDT: 'solana',
  ADAUSDT: 'cardano',
  DOGEUSDT: 'dogecoin',
  AVAXUSDT: 'avalanche-2',
  DOTUSDT: 'polkadot',
  LINKUSDT: 'chainlink',
  MATICUSDT: 'matic-network',
  SHIBUSDT: 'shiba-inu',
  LTCUSDT: 'litecoin',
  BCHUSDT: 'bitcoin-cash',
  XLMUSDT: 'stellar',
  UNIUSDT: 'uniswap',
  ATOMUSDT: 'cosmos',
  ICPUSDT: 'internet-computer',
  VETUSDT: 'vechain',
  ARBUSDT: 'arbitrum',
  NEARUSDT: 'near',
  SUIUSDT: 'sui',
  TRXUSDT: 'tron',
  FILUSDT: 'filecoin',
  ETCUSDT: 'ethereum-classic',
  HBARUSDT: 'hedera-hashgraph',
  FTMUSDT: 'fantom',
  ALGOUSDT: 'algorand',
  GRTUSDT: 'the-graph',
  AAVEUSDT: 'aave',
  TONUSDT: 'the-open-network',
  RENDERUSDT: 'render-token',
  KASUSDT: 'kaspa',
};

const CG_TO_BINANCE: Record<string, string> = Object.fromEntries(
  Object.entries(BINANCE_TO_CG).map(([k, v]) => [v, k])
);

async function fetchCoinGeckoQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  // BINANCE:BTCUSDT veya COINBASE:BTCUSD → BTCUSDT
  const rawSymbols = symbols.map(s =>
    s.replace('BINANCE:', '').replace('COINBASE:', '').toUpperCase()
  );
  // USDC suffix normalize: BTCUSD → BTCUSDT fallback
  const coinIds = rawSymbols
    .map(s => BINANCE_TO_CG[s] ?? BINANCE_TO_CG[s + 'T'])
    .filter((id): id is string => Boolean(id));

  if (coinIds.length === 0) return [];

  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds.join(',')}&order=market_cap_desc&sparkline=false`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error('[quote/coingecko] status', res.status, await res.text());
      return [];
    }
    const data: Array<{
      id: string;
      current_price: number;
      price_change_24h: number;
      price_change_percentage_24h: number;
      total_volume: number;
      high_24h: number;
      low_24h: number;
    }> = await res.json();

    return data.map(coin => {
      const binanceSym = CG_TO_BINANCE[coin.id] ?? (coin.id.toUpperCase() + 'USDT');
      // Reconstruct original prefixed symbol
      const originalSym = symbols.find(s =>
        s.replace('BINANCE:', '').replace('COINBASE:', '').toUpperCase() === binanceSym ||
        s.replace('BINANCE:', '').replace('COINBASE:', '').toUpperCase() === binanceSym.slice(0, -1)
      ) ?? `BINANCE:${binanceSym}`;

      return {
        symbol: originalSym,
        price: coin.current_price,
        change: coin.price_change_24h ?? 0,
        changePercent: coin.price_change_percentage_24h ?? 0,
        volume: coin.total_volume,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        timestamp: Date.now(),
        source: 'binance' as const,
      };
    });
  } catch (e) {
    console.error('[quote/coingecko]', e);
    return [];
  }
}

async function fetchFinnhubQuote(symbol: string): Promise<Quote | null> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return null;

  let finnhubSymbol = symbol;
  if (symbol.startsWith('BIST:')) {
    finnhubSymbol = symbol.replace('BIST:', '') + '.IS';
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const q: {
      c?: number;
      d?: number;
      dp?: number;
      h?: number;
      l?: number;
    } = await res.json();

    if (!q.c || q.c === 0) return null;

    return {
      symbol,
      price: q.c,
      change: q.d ?? 0,
      changePercent: q.dp ?? 0,
      high24h: q.h,
      low24h: q.l,
      timestamp: Date.now(),
      source: 'yahoo',
    };
  } catch (e) {
    console.error('[quote/finnhub]', symbol, e);
    return null;
  }
}

async function fetchStockQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const results = await Promise.all(symbols.map(s => fetchFinnhubQuote(s)));
  return results.filter((q): q is Quote => q !== null);
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols');
  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  const cryptoSymbols = symbols.filter(s => s.startsWith('BINANCE:') || s.startsWith('COINBASE:'));
  const stockSymbols = symbols.filter(s => !cryptoSymbols.includes(s));

  try {
    const [cryptoQuotes, stockQuotes] = await Promise.all([
      fetchCoinGeckoQuotes(cryptoSymbols),
      fetchStockQuotes(stockSymbols),
    ]);

    const quotes = [...cryptoQuotes, ...stockQuotes];

    // Don't cache empty/partial responses — avoids poisoning the CDN with bad data
    const expectedCount = cryptoSymbols.length + stockSymbols.length;
    const cacheHeader = quotes.length === expectedCount
      ? 's-maxage=15, stale-while-revalidate=30'
      : 'no-store, no-cache, must-revalidate';

    return NextResponse.json(
      { quotes, count: quotes.length },
      { headers: { 'Cache-Control': cacheHeader } }
    );
  } catch (e) {
    console.error('[quote]', e);
    return NextResponse.json({ error: 'Failed to fetch quotes', quotes: [] }, { status: 500 });
  }
}
