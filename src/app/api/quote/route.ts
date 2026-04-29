import { NextRequest, NextResponse } from 'next/server';

/**
 * Bulk Quote API — canli fiyat + 24h % degisim
 *
 * GET /api/quote?symbols=BINANCE:BTCUSDT,AAPL,OANDA:EUR_USD
 *
 * Kaynaklar:
 *  - Binance: /api/v3/ticker/24hr (crypto, ucretsiz, limitsiz)
 *  - Yahoo Finance: /v7/finance/quote (stocks/forex/BIST, ucretsiz)
 *
 * Cache: 15 saniye (canli his icin hizli yenilenmeli ama API'yi bombalamayalim)
 */

interface Quote {
  symbol: string;
  price: number;
  change: number;         // Mutlak deger
  changePercent: number;  // Yuzde
  volume?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
  source: 'binance' | 'yahoo';
}

// Binance 24hr ticker
async function fetchBinanceQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const binanceSymbols = symbols.map(s => s.replace('BINANCE:', ''));
  // Bulk ticker: /api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT"]
  const symbolsParam = encodeURIComponent(JSON.stringify(binanceSymbols));
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`;

  try {
    const res = await fetch(url, { next: { revalidate: 15 } });
    if (!res.ok) return [];
    const data: Array<{
      symbol: string;
      lastPrice: string;
      priceChange: string;
      priceChangePercent: string;
      volume: string;
      highPrice: string;
      lowPrice: string;
    }> = await res.json();

    return data.map(d => ({
      symbol: `BINANCE:${d.symbol}`,
      price: parseFloat(d.lastPrice),
      change: parseFloat(d.priceChange),
      changePercent: parseFloat(d.priceChangePercent),
      volume: parseFloat(d.volume),
      high24h: parseFloat(d.highPrice),
      low24h: parseFloat(d.lowPrice),
      timestamp: Date.now(),
      source: 'binance' as const,
    }));
  } catch (e) {
    console.error('[quote/binance]', e);
    return [];
  }
}

// Stocks/Forex/BIST: Finnhub quote endpoint
// Yahoo v7 quote API kapali, onun yerine Finnhub'in /quote'unu kullaniyoruz
// BIST icin Finnhub'a .IS ekliyoruz, OANDA forex icin Finnhub'in OANDA:prefix'i zaten calisir
async function fetchFinnhubQuote(symbol: string): Promise<Quote | null> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return null;

  // BIST: BIST:ASELS -> ASELS.IS (Finnhub .IS suffix kullanir)
  let finnhubSymbol = symbol;
  if (symbol.startsWith('BIST:')) {
    finnhubSymbol = symbol.replace('BIST:', '') + '.IS';
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 15 } });
    if (!res.ok) return null;
    const q: {
      c?: number;  // current
      d?: number;  // change
      dp?: number; // percent change
      h?: number;  // high
      l?: number;  // low
      o?: number;  // open
      pc?: number; // previous close
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
      source: 'yahoo', // (kaynak etiket, UI'de "Live" yeter)
    };
  } catch (e) {
    console.error('[quote/finnhub]', symbol, e);
    return null;
  }
}

async function fetchStockQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  // Finnhub bulk quote yok — paralel tek tek cekiyoruz
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

  // Binance vs Yahoo olarak bol
  const binanceSymbols = symbols.filter(s => s.startsWith('BINANCE:') || s.startsWith('COINBASE:'));
  const yahooSymbols = symbols.filter(s => !binanceSymbols.includes(s));

  try {
    const [binanceQuotes, stockQuotes] = await Promise.all([
      fetchBinanceQuotes(binanceSymbols),
      fetchStockQuotes(yahooSymbols),
    ]);

    const quotes = [...binanceQuotes, ...stockQuotes];

    return NextResponse.json(
      { quotes, count: quotes.length },
      { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=20' } }
    );
  } catch (e) {
    console.error('[quote]', e);
    return NextResponse.json({ error: 'Failed to fetch quotes', quotes: [] }, { status: 500 });
  }
}
