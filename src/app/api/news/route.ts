import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

type NewsCategory = 'crypto' | 'stocks' | 'forex' | 'economy' | 'general';

// Bilinen kripto tickerlari. Backend hem "BINANCE:BTCUSDT" hem "BTCUSD"
// hem yalin "BTC" hem de "APRILUSD" gibi yeni altcoin sembollerini
// gonderebiliyor — bu liste suffix kuralini (*USD/*USDT) tamamlar.
const CRYPTO_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'BNB', 'ADA', 'DOGE', 'DOT', 'LINK',
  'MATIC', 'SHIB', 'PEPE', 'LTC', 'ATOM', 'NEAR', 'APT', 'ARB', 'OP', 'INJ',
  'SUI', 'TRX', 'UNI', 'FIL', 'ICP', 'ETC', 'XLM', 'HBAR', 'VET', 'FTM',
  'ALGO', 'GRT', 'AAVE', 'MKR', 'SAND', 'MANA', 'APE', 'CRV', 'RUNE', 'KAS',
  'TON', 'PI', 'WLD', 'RENDER', 'RNDR', 'TAO',
]);

// Baslik bazinda (sembol yokken) kripto vs hisse ipuclari. Regex word
// boundary (\b) ile tam-kelime esleme: "defi" artik "definition" icinde
// yakalanmaz, "eth" de "ethics" icinde. Turkce+Ingilizce.
const CRYPTO_REGEX = /\b(bitcoin|ethereum|btc|eth|xrp|sol|ada|doge|dot|link|avax|bnb|polkadot|avalanche|solana|cardano|dogecoin|chainlink|ripple|tron|binance|coinbase|kraken|kripto|crypto|cryptocurrency|altcoin|stablecoin|memecoin|blockchain|web3|defi|nft|polymarket|pepe|shiba|shib)\b/i;
const STOCK_REGEX = /\b(hisse|hisseler|nasdaq|nyse|dow\s+jones|s&p\s*500|bist|earnings|bilanco|bilanço|temettu|temettü|dividend|stocks?|shares?|ipo|equities|wall\s+street)\b/i;

// Haberi sembol VE (yoksa) baslik icerigine gore sinifla.
//   - BINANCE: / COINBASE: / KRAKEN: prefix                → crypto
//   - BTCUSD / ETHUSDT / APRILUSD gibi *USD(T|C)? suffix   → crypto
//   - Bilinen kripto ticker (BTC, ETH, SOL...)             → crypto
//   - OANDA: / FX: prefix                                  → forex
//   - BIST: prefix veya 1-5 harf duz ticker (AAPL, NVDA)   → stocks
//   - Sembol yok ise: baslikta kripto kelime               → crypto
//                     baslikta hisse kelimesi              → stocks
//   - Hicbiri degilse                                      → general
function classifyNewsCategory(symbol?: string | null, title?: string | null): NewsCategory {
  if (symbol) {
    const s = symbol.toUpperCase();
    if (s.startsWith('BINANCE:') || s.startsWith('COINBASE:') || s.startsWith('KRAKEN:')) return 'crypto';
    if (s.startsWith('OANDA:') || s.startsWith('FX:')) return 'forex';
    if (s.startsWith('BIST:')) return 'stocks';
    // "BTCUSD", "ETHUSDT", "APRILUSD" gibi kripto parite sembolleri
    if (/^[A-Z0-9]{2,10}USD[TC]?$/.test(s)) return 'crypto';
    // Bilinen yalin kripto ticker
    if (CRYPTO_TICKERS.has(s)) return 'crypto';
    // Duz ABD hissesi (ornek: AAPL, NVDA, DRVN)
    if (/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(s)) return 'stocks';
  }
  if (title) {
    if (CRYPTO_REGEX.test(title)) return 'crypto';
    if (STOCK_REGEX.test(title)) return 'stocks';
  }
  return 'general';
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // Frontend tarafında kategori 'all' ise parametre gönderilmiyor; yine de
  // savunmacı kalalım.
  const rawCategory = params.get('category');
  const categoryFilter: NewsCategory | null =
    rawCategory && rawCategory !== 'all' ? (rawCategory as NewsCategory) : null;

  // Filtreleme sonrası yeterli sayı görünmesi için backend'den daha fazla
  // çekiyoruz; böylece sadece-crypto gibi dar filtrelerde liste boş kalmaz.
  const requestedLimit = Math.min(parseInt(params.get('limit') || '30', 10), 100);
  const fetchLimit = categoryFilter ? Math.min(requestedLimit * 3, 100) : requestedLimit;
  const beforeId = params.get('before_id'); // infinite scroll cursor

  // /news/feed = analizi tamamlanmış (analyzed=True) haberler, id DESC.
  const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const q = new URLSearchParams({ limit: String(fetchLimit) });
  if (beforeId) q.set('before_id', beforeId);
  const targetUrl = `${backendUrl}/news/feed?${q.toString()}`;

  try {
    const res = await fetch(targetUrl, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }

    const backendNews = await res.json();

    // Backend NewsItem → Frontend NewsTab.NewsItem dönüşümü.
    // `analyzed` flag'i UI loading-state için kritik: false ise dashboard
    // "AI özeti hazırlanıyor..." gösterir, SSE ile gelen update'de true olur.
    const allNews = backendNews.map((n: any) => ({
      id: String(n.id),
      title: n.original_title,
      summary: n.dashboard_summary || n.ai_summary || '',
      source: n.source,
      category: classifyNewsCategory(n.symbol, n.original_title),
      url: n.original_link,
      publishedAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
      symbols: n.symbol ? [n.symbol] : undefined,
      telegram_hook: n.telegram_hook || '',
      dashboard_summary: n.dashboard_summary || '',
      axiom_analysis: n.axiom_analysis || '',
      analyzed: Boolean(n.analyzed),
      is_urgent: Boolean(n.is_urgent),
    }));

    const filtered = categoryFilter
      ? allNews.filter((n: any) => n.category === categoryFilter).slice(0, requestedLimit)
      : allNews.slice(0, requestedLimit);

    // Day 28 #10: 20s → 5s. SSE birincil kanal, /api/news fallback;
    // fallback bile breaking news'i 20s gizliyor — yayın akışında kabul
    // edilemez. 5s edge cache + stale-while-revalidate=15s.
    const cacheHeader = filtered.length > 0
      ? 's-maxage=5, stale-while-revalidate=15'
      : 'no-store, no-cache, must-revalidate';

    return NextResponse.json(
      {
        count: filtered.length,
        totalFetched: allNews.length,
        category: categoryFilter,
        sources: {},
        news: filtered,
        fetchedAt: Date.now(),
      },
      { headers: { 'Cache-Control': cacheHeader } }
    );
  } catch (error) {
    console.error('News proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news from backend', news: [] },
      { status: 500 }
    );
  }
}
