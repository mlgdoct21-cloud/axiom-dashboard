/**
 * Pluggable News Source Architecture
 *
 * Bu dosya haber kaynaklarini soyut bir interface ile tanimlar.
 * Boylece ileride RSS'ten premium API'ya gecis (ornek: Investing Pro, CoinDesk Pro)
 * sadece /api/news/route.ts'deki ACTIVE_SOURCES listesini degistirmeyi gerektirir.
 *
 * Mevcut kaynaklar:
 *  - RSS: ucretsiz, limitsiz, sadece okuma
 *  - Finnhub: API key ile, 60 req/dk ucretsiz tier
 *
 * Ileride eklenecek (premium tier icin):
 *  - CryptoPanic API
 *  - CoinDesk Pro API
 *  - Investing.com API
 *  - NewsAPI.org
 *  - Marketaux
 */

export interface NewsItem {
  id: string;                // Unique ID (source + hash of url)
  title: string;
  summary: string;           // Kisa ozet (max 300 karakter)
  url: string;               // Dis link
  imageUrl?: string;
  source: string;            // "CoinDesk", "Yahoo Finance", vb.
  category: NewsCategory;
  publishedAt: number;       // Unix timestamp (milliseconds)
  symbols?: string[];        // Bahsedilen semboller (AAPL, BTC, vb.)
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export type NewsCategory = 'crypto' | 'stocks' | 'forex' | 'economy' | 'general';

export interface NewsSource {
  id: string;
  name: string;
  defaultCategory: NewsCategory;
  fetch(): Promise<NewsItem[]>;
}

// ============================================================
// SYMBOL EXTRACTION
// ============================================================

/**
 * Haber metninde bahsedilen sembolleri cikarir.
 * Basit kelime eslemesi: "Bitcoin" -> BTCUSDT, "Apple" -> AAPL vb.
 * Case-insensitive, word-boundary ile.
 */
const SYMBOL_MAP: Record<string, string> = {
  // Cryptos (full name + ticker)
  bitcoin: 'BINANCE:BTCUSDT',
  btc: 'BINANCE:BTCUSDT',
  ethereum: 'BINANCE:ETHUSDT',
  eth: 'BINANCE:ETHUSDT',
  solana: 'BINANCE:SOLUSDT',
  sol: 'BINANCE:SOLUSDT',
  binance: 'BINANCE:BNBUSDT',
  bnb: 'BINANCE:BNBUSDT',
  xrp: 'BINANCE:XRPUSDT',
  ripple: 'BINANCE:XRPUSDT',
  cardano: 'BINANCE:ADAUSDT',
  ada: 'BINANCE:ADAUSDT',
  dogecoin: 'BINANCE:DOGEUSDT',
  doge: 'BINANCE:DOGEUSDT',
  avalanche: 'BINANCE:AVAXUSDT',
  avax: 'BINANCE:AVAXUSDT',
  polkadot: 'BINANCE:DOTUSDT',
  chainlink: 'BINANCE:LINKUSDT',
  polygon: 'BINANCE:MATICUSDT',
  matic: 'BINANCE:MATICUSDT',
  shiba: 'BINANCE:SHIBUSDT',
  pepe: 'BINANCE:PEPEUSDT',

  // Stocks (full name + ticker)
  apple: 'AAPL',
  aapl: 'AAPL',
  microsoft: 'MSFT',
  msft: 'MSFT',
  nvidia: 'NVDA',
  nvda: 'NVDA',
  tesla: 'TSLA',
  tsla: 'TSLA',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  googl: 'GOOGL',
  amazon: 'AMZN',
  amzn: 'AMZN',
  meta: 'META',
  facebook: 'META',
  netflix: 'NFLX',
  nflx: 'NFLX',

  // Forex
  'eur/usd': 'OANDA:EUR_USD',
  'gbp/usd': 'OANDA:GBP_USD',
  'usd/jpy': 'OANDA:USD_JPY',
  'usd/try': 'OANDA:USD_TRY',
  dollar: 'OANDA:USD_EUR',

  // Economy
  'sp 500': 'SPY',
  'sp500': 'SPY',
  nasdaq: 'QQQ',
  'dow jones': 'DIA',
  gold: 'GLD',
  altin: 'GLD',
};

export function extractSymbols(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const [keyword, symbol] of Object.entries(SYMBOL_MAP)) {
    // Word boundary regex (Unicode-safe)
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i');
    if (regex.test(lower)) {
      found.add(symbol);
    }
  }

  return Array.from(found).slice(0, 5); // Max 5 sembol
}

// ============================================================
// RSS SOURCE
// ============================================================

/**
 * Basit RSS 2.0 parser (regex based, library'siz).
 * CDATA ve HTML entity'leri temizler.
 */
function parseRSS(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
}> {
  const items: ReturnType<typeof parseRSS> = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  const matches = xml.matchAll(itemRegex);

  for (const match of matches) {
    const content = match[1];
    const title = extractTag(content, 'title');
    const link = extractTag(content, 'link');
    const description = extractTag(content, 'description');
    const pubDate = extractTag(content, 'pubDate') || extractTag(content, 'dc:date');

    // Image: media:content, media:thumbnail, enclosure, or <img> in description
    let image: string | undefined;
    const mediaMatch = content.match(/<media:(content|thumbnail)[^>]*url=["']([^"']+)["']/);
    if (mediaMatch) image = mediaMatch[2];
    if (!image) {
      const enclosure = content.match(/<enclosure[^>]*url=["']([^"']+)["']/);
      if (enclosure) image = enclosure[1];
    }
    if (!image && description) {
      const imgInDesc = description.match(/<img[^>]*src=["']([^"']+)["']/i);
      if (imgInDesc) image = imgInDesc[1];
    }

    if (title && link) {
      items.push({ title, link, description: description || '', pubDate: pubDate || '', image });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  let value = match[1].trim();
  // CDATA temizligi
  value = value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
  // HTML etiketlerini temizle
  value = value.replace(/<[^>]+>/g, ' ');
  // HTML entity'ler
  value = value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return value;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export class RSSNewsSource implements NewsSource {
  id: string;
  name: string;
  defaultCategory: NewsCategory;
  private url: string;

  constructor(opts: { id: string; name: string; url: string; category: NewsCategory }) {
    this.id = opts.id;
    this.name = opts.name;
    this.url = opts.url;
    this.defaultCategory = opts.category;
  }

  async fetch(): Promise<NewsItem[]> {
    try {
      const res = await global.fetch(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (AXIOM News Aggregator)',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
        next: { revalidate: 300 }, // 5 dakika cache
      });

      if (!res.ok) {
        console.warn(`[RSS ${this.id}] HTTP ${res.status}`);
        return [];
      }

      const xml = await res.text();
      const items = parseRSS(xml);

      return items.slice(0, 30).map(item => {
        const fullText = `${item.title} ${item.description}`;
        return {
          id: `${this.id}_${hashString(item.link)}`,
          title: item.title,
          summary: item.description.slice(0, 300),
          url: item.link,
          imageUrl: item.image,
          source: this.name,
          category: this.defaultCategory,
          publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
          symbols: extractSymbols(fullText),
        };
      }).filter(n => !isNaN(n.publishedAt));
    } catch (e) {
      console.error(`[RSS ${this.id}] fetch error:`, e);
      return [];
    }
  }
}

// ============================================================
// FINNHUB SOURCE
// ============================================================

export class FinnhubNewsSource implements NewsSource {
  id = 'finnhub';
  name = 'Finnhub';
  defaultCategory: NewsCategory;
  private apiCategory: string; // finnhub's category enum

  constructor(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general') {
    this.apiCategory = category;
    this.defaultCategory =
      category === 'crypto' ? 'crypto' :
      category === 'forex' ? 'forex' :
      category === 'merger' ? 'stocks' : 'general';
  }

  async fetch(): Promise<NewsItem[]> {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
      console.warn('[Finnhub] API key missing, skipping');
      return [];
    }

    try {
      const url = `https://finnhub.io/api/v1/news?category=${this.apiCategory}&token=${apiKey}`;
      const res = await global.fetch(url, { next: { revalidate: 300 } });

      if (!res.ok) {
        console.warn(`[Finnhub] HTTP ${res.status}`);
        return [];
      }

      const data: Array<{
        id: number;
        headline: string;
        summary: string;
        url: string;
        image: string;
        source: string;
        datetime: number;   // Unix seconds
        category: string;
        related: string;
      }> = await res.json();

      if (!Array.isArray(data)) return [];

      return data.slice(0, 50).map(n => {
        const fullText = `${n.headline} ${n.summary}`;
        // Finnhub 'related' field symbol listesi olabilir (virgulle)
        const relatedSymbols = (n.related || '').split(',').filter(s => s.trim().length > 0);
        const extractedSymbols = extractSymbols(fullText);
        const symbols = Array.from(new Set([...relatedSymbols, ...extractedSymbols])).slice(0, 5);

        return {
          id: `finnhub_${n.id}`,
          title: n.headline,
          summary: (n.summary || '').slice(0, 300),
          url: n.url,
          imageUrl: n.image || undefined,
          source: n.source || 'Finnhub',
          category: this.defaultCategory,
          publishedAt: n.datetime * 1000,
          symbols,
        };
      });
    } catch (e) {
      console.error('[Finnhub] fetch error:', e);
      return [];
    }
  }
}

// ============================================================
// ACTIVE SOURCES (swap-able)
// ============================================================

/**
 * Aktif haber kaynaklari. Ileride abonelik tier'i geldiginde
 * bu liste kullanicinin tier'ine gore dinamik doldurulabilir:
 *
 *   if (user.tier === 'free') return [RSS_SOURCES];
 *   if (user.tier === 'pro')  return [RSS_SOURCES, FINNHUB, CRYPTOPANIC];
 *   if (user.tier === 'premium') return [ALL_SOURCES];
 */
export function getActiveSources(): NewsSource[] {
  return [
    // Crypto RSS feed'leri
    new RSSNewsSource({
      id: 'coindesk',
      name: 'CoinDesk',
      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      category: 'crypto',
    }),
    new RSSNewsSource({
      id: 'cointelegraph',
      name: 'Cointelegraph',
      url: 'https://cointelegraph.com/rss',
      category: 'crypto',
    }),
    // Finansal RSS feed'leri
    new RSSNewsSource({
      id: 'investing',
      name: 'Investing.com',
      url: 'https://www.investing.com/rss/news.rss',
      category: 'general',
    }),
    new RSSNewsSource({
      id: 'yahoo',
      name: 'Yahoo Finance',
      url: 'https://finance.yahoo.com/news/rssindex',
      category: 'general',
    }),
    // Finnhub API (structured, sentiment icin daha iyi)
    new FinnhubNewsSource('general'),
    new FinnhubNewsSource('crypto'),
    new FinnhubNewsSource('forex'),
  ];
}
