// SEC EDGAR -- Free MD&A extraction (10-K annual + 10-Q quarterly)
//
// Flow:
//   Symbol → CIK  (sec.gov/files/company_tickers.json -- 1h memory cache)
//   CIK → Filing URL  (data.sec.gov/submissions/CIK{n}.json)
//   URL → MD&A text   (HTML fetch + regex Item 7 for 10-K, Item 2 for 10-Q)
//
// Zero cost, zero new dependencies.

const SEC_UA = 'AXIOM/1.0 (contact@axiomfinance.app)';

// ─── Ticker → CIK lookup (memory cache) ───────────────────────────────────────

let _tickerMap: Map<string, number> | null = null;
let _tickerMapFetchedAt = 0;
const TICKER_TTL_MS = 60 * 60 * 1000; // 1h

async function getTickerMap(): Promise<Map<string, number>> {
  const now = Date.now();
  if (_tickerMap && now - _tickerMapFetchedAt < TICKER_TTL_MS) return _tickerMap;

  const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
    headers: { 'User-Agent': SEC_UA },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`company_tickers HTTP ${res.status}`);

  const data: Record<string, { cik_str: number; ticker: string }> = await res.json();

  const map = new Map<string, number>();
  for (const item of Object.values(data)) {
    map.set(String(item.ticker).toUpperCase(), Number(item.cik_str));
  }
  _tickerMap = map;
  _tickerMapFetchedAt = now;
  return map;
}

// ─── CIK → Latest filing URL ──────────────────────────────────────────────────

async function getLatestFilingUrl(
  cik: number,
  formType: '10-K' | '10-Q',
): Promise<string | null> {
  const padded = String(cik).padStart(10, '0');
  const res = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, {
    headers: { 'User-Agent': SEC_UA },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const forms: string[] = data?.filings?.recent?.form ?? [];
  const docs: string[] = data?.filings?.recent?.primaryDocument ?? [];
  const accessions: string[] = data?.filings?.recent?.accessionNumber ?? [];

  const idx = forms.findIndex((f) => f === formType);
  if (idx === -1) return null;

  const accClean = accessions[idx].replace(/-/g, '');
  const doc = docs[idx];
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc}`;
}

// ─── HTML → MD&A text extraction ─────────────────────────────────────────────
//
// 10-K: MD&A = Item 7  → ends at Item 7A or Item 8
// 10-Q: MD&A = Item 2  → ends at Item 3
//
// SEC filings use inconsistent HTML across companies/years -- patterns cover
// the most common variants (bold text, anchor names, inline headings).

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractMdAndA(html: string, formType: '10-K' | '10-Q'): string | null {
  // 10-K files typically have a TOC entry for "Item 7" (short, ~1KB)
  // followed by the real MD&A section (long, 100KB+).
  // Strategy: iterate all "Item N" matches, pick the longest section.
  // Stop once we find one > 5KB (that's the real one).
  let startRe: RegExp;
  let endRe: RegExp;

  if (formType === '10-K') {
    startRe = /item\s*7[.\s]/gi;
    endRe = /item\s*7\s*a[\s.:]|item\s*8[\s.:]/i;
  } else {
    // 10-Q Part I Item 2
    startRe = /item\s*2[.\s]/gi;
    endRe = /item\s*3[\s.:]/i;
  }

  let bestStart = -1;
  let bestLen = 0;
  let match: RegExpExecArray | null;

  while ((match = startRe.exec(html)) !== null) {
    const after = html.slice(match.index);
    const endIdx = after.search(endRe);
    const sectionLen = endIdx > 0 ? endIdx : 80_000;
    if (sectionLen > bestLen) {
      bestLen = sectionLen;
      bestStart = match.index;
    }
    if (sectionLen > 5_000) break; // real MD&A section found, stop iterating
  }

  if (bestStart === -1) return null;

  const chunk = html.slice(bestStart, bestStart + Math.min(bestLen, 80_000));
  const text = stripHtml(chunk);

  if (text.length < 300) return null;

  return text.slice(0, 2500);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type SecFilingsData = {
  annual: string | null;    // 10-K  MD&A (Item 7)
  quarterly: string | null; // 10-Q  MD&A (Item 2)
};

export async function getSecFilingsData(symbol: string): Promise<SecFilingsData> {
  const empty: SecFilingsData = { annual: null, quarterly: null };

  try {
    const map = await getTickerMap();
    const cik = map.get(symbol.toUpperCase());
    if (!cik) return empty;

    // Fetch 10-K and 10-Q URLs in parallel
    const [annualUrl, quarterlyUrl] = await Promise.all([
      getLatestFilingUrl(cik, '10-K'),
      getLatestFilingUrl(cik, '10-Q'),
    ]);

    // Fetch both HTMLs in parallel (8s timeout each)
    const [annualHtml, quarterlyHtml] = await Promise.all([
      annualUrl
        ? fetch(annualUrl, {
            headers: { 'User-Agent': SEC_UA },
            signal: AbortSignal.timeout(8000),
          })
            .then((r) => (r.ok ? r.text() : null))
            .catch(() => null)
        : Promise.resolve(null),

      quarterlyUrl
        ? fetch(quarterlyUrl, {
            headers: { 'User-Agent': SEC_UA },
            signal: AbortSignal.timeout(8000),
          })
            .then((r) => (r.ok ? r.text() : null))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      annual: annualHtml ? extractMdAndA(annualHtml, '10-K') : null,
      quarterly: quarterlyHtml ? extractMdAndA(quarterlyHtml, '10-Q') : null,
    };
  } catch (e) {
    console.warn(`[sec-edgar] ${symbol}: ${String(e).slice(0, 120)}`);
    return empty;
  }
}
