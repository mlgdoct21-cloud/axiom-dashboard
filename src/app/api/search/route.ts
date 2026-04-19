import { NextRequest, NextResponse } from 'next/server';

/**
 * Sembol arama API
 *
 * GET /api/search?q=apple&type=stock
 * GET /api/search?q=btc&type=crypto
 * GET /api/search?q=garan&type=bist
 *
 * Kaynaklar:
 * - Stock: Finnhub search (tum hisseler + forex)
 * - Crypto: Binance exchangeInfo (618+ USDT pairs)
 * - BIST: Yahoo Finance (.IS suffix ile)
 */

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';

export interface SearchResult {
  symbol: string;        // Dahili sembol (grafik icin kullanilacak)
  display: string;       // Kullaniciya gosterilecek
  description: string;   // Aciklama (sirket/proje adi)
  type: 'stock' | 'crypto' | 'bist' | 'forex';
}

// Binance sembol listesi cache'i (her server icin bir kere cek)
let binanceSymbolsCache: string[] | null = null;
let binanceCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 saat

async function getBinanceSymbols(): Promise<string[]> {
  const now = Date.now();
  if (binanceSymbolsCache && now - binanceCacheTime < CACHE_DURATION) {
    return binanceSymbolsCache;
  }

  try {
    const res = await fetch('https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const symbols: string[] = data.symbols
      .filter((s: { status: string; symbol: string }) => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
      .map((s: { symbol: string }) => s.symbol);

    binanceSymbolsCache = symbols;
    binanceCacheTime = now;
    return symbols;
  } catch (e) {
    console.error('Binance symbols error:', e);
    return [];
  }
}

async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!FINNHUB_API_KEY) return [];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    if (!data.result || !Array.isArray(data.result)) return [];

    return data.result
      .filter((r: { type: string; symbol: string }) =>
        r.type === 'Common Stock' &&
        !r.symbol.includes('.') // US hisseleri oncelik ver (.SS, .L gibi olmayanlar)
      )
      .slice(0, 15)
      .map((r: { symbol: string; displaySymbol: string; description: string }) => ({
        symbol: r.symbol,
        display: r.displaySymbol || r.symbol,
        description: r.description,
        type: 'stock' as const,
      }));
  } catch (e) {
    console.error('Stock search error:', e);
    return [];
  }
}

async function searchCrypto(query: string): Promise<SearchResult[]> {
  const allSymbols = await getBinanceSymbols();
  const q = query.toUpperCase();

  // Sembolun adini cikar (BTCUSDT -> BTC)
  const matches = allSymbols
    .filter(s => s.includes(q))
    .sort((a, b) => {
      // Tam eslesme onceliği
      const aBase = a.replace('USDT', '');
      const bBase = b.replace('USDT', '');
      if (aBase === q) return -1;
      if (bBase === q) return 1;
      if (aBase.startsWith(q) && !bBase.startsWith(q)) return -1;
      if (bBase.startsWith(q) && !aBase.startsWith(q)) return 1;
      return a.length - b.length;
    })
    .slice(0, 15);

  return matches.map(s => {
    const base = s.replace('USDT', '');
    return {
      symbol: `BINANCE:${s}`,
      display: base,
      description: `${base}/USDT`,
      type: 'crypto' as const,
    };
  });
}

async function searchBIST(query: string): Promise<SearchResult[]> {
  if (!FINNHUB_API_KEY) return [];

  try {
    // Finnhub search + BIST (.IS suffix) filtreleme
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}&exchange=IS`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    if (!data.result || !Array.isArray(data.result)) return [];

    return data.result
      .filter((r: { symbol: string }) => r.symbol.endsWith('.IS'))
      .slice(0, 15)
      .map((r: { symbol: string; description: string }) => {
        const baseSymbol = r.symbol.replace('.IS', '');
        return {
          symbol: `BIST:${baseSymbol}`, // Dahili: BIST:ASELS
          display: baseSymbol,
          description: r.description,
          type: 'bist' as const,
        };
      });
  } catch (e) {
    console.error('BIST search error:', e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'stock'; // stock, crypto, bist

  if (query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    let results: SearchResult[] = [];

    switch (type) {
      case 'crypto':
        results = await searchCrypto(query);
        break;
      case 'bist':
        results = await searchBIST(query);
        break;
      case 'stock':
      default:
        results = await searchStocks(query);
        break;
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed', results: [] }, { status: 500 });
  }
}
