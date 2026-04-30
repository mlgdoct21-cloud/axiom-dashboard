/**
 * Server-only BIST detection & search.
 *
 * Wraps yahoo-finance2 to:
 *   - Detect any BIST stock (not just our hard-coded popular list)
 *   - Provide live, full-coverage search results
 *
 * Never import this from a client component — it pulls in yahoo-finance2
 * which is server-only.
 */

// SERVER ONLY — never import from client components (pulls in yahoo-finance2).
import YahooFinance from 'yahoo-finance2';
import { isBIST, toYahooSymbol, type Market } from './bist-symbols';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ── Cache (per-process, 30 min TTL) ────────────────────────────────
const _detectCache = new Map<string, { market: Market; ts: number }>();
const DETECT_TTL_MS = 30 * 60 * 1000;

function _cachedMarket(sym: string): Market | null {
  const e = _detectCache.get(sym);
  if (!e) return null;
  if (Date.now() - e.ts > DETECT_TTL_MS) {
    _detectCache.delete(sym);
    return null;
  }
  return e.market;
}

function _setMarket(sym: string, market: Market) {
  _detectCache.set(sym, { market, ts: Date.now() });
}

/**
 * Detect a symbol's market with Yahoo as fallback.
 *
 * - Hard-coded BIST_SYMBOLS → instant TR (no network)
 * - Anything else → quick Yahoo `${sym}.IS` lookup; if it returns a price, TR
 * - Otherwise → US
 *
 * Result cached for 30 min per symbol.
 */
export async function isBISTAsync(symbol: string): Promise<boolean> {
  const sym = symbol.toUpperCase().trim();
  if (!sym) return false;
  if (isBIST(sym)) return true;

  const cached = _cachedMarket(sym);
  if (cached) return cached === 'TR';

  try {
    const q = await yahooFinance.quote(toYahooSymbol(sym));
    const single: any = Array.isArray(q) ? q[0] : q;
    const price = Number(single?.regularMarketPrice ?? 0);
    const exchange = String(single?.fullExchangeName || single?.exchange || '');
    const isIST = price > 0 && /\.IS$/.test(String(single?.symbol || '')) || /Istanbul|IST/i.test(exchange);
    const market: Market = isIST ? 'TR' : 'US';
    _setMarket(sym, market);
    return market === 'TR';
  } catch {
    _setMarket(sym, 'US');
    return false;
  }
}

/**
 * Live BIST search via Yahoo. Returns up to `limit` BIST equities matching the query.
 * Symbols are returned WITHOUT the `.IS` suffix to match our internal convention.
 */
export async function searchBISTYahoo(query: string, limit = 8) {
  const q = query.trim();
  if (!q) return [];
  try {
    const r = await yahooFinance.search(q, { quotesCount: 12, newsCount: 0 });
    const quotes = (r.quotes || []) as any[];
    return quotes
      .filter(x =>
        x?.quoteType === 'EQUITY' &&
        typeof x.symbol === 'string' &&
        x.symbol.endsWith('.IS')
      )
      .slice(0, limit)
      .map(x => ({
        symbol: String(x.symbol).replace(/\.IS$/, ''),
        name: x.longname || x.shortname || x.symbol,
        displaySymbol: String(x.symbol).replace(/\.IS$/, ''),
        type: 'BIST',
        market: 'TR' as Market,
      }));
  } catch (e) {
    console.error('[bist-search]', (e as Error).message);
    return [];
  }
}
