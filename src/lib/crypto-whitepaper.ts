const FETCH_TIMEOUT_MS = 4000;  // 3s → 4s max per URL (Vercel 10s limit)
const DEFAULT_MAX_CHARS = 4000;

// Direct HTML documentation pages (no PDF, clean extractable text)
const HTML_DOCS: Record<string, string> = {
  ETH:  'https://ethereum.org/en/whitepaper/',
  SOL:  'https://solana.com/solana-whitepaper.pdf',  // skip PDF, use below
  BTC:  'https://bitcoin.org/en/bitcoin-paper',
  ARB:  'https://docs.arbitrum.io/intro/',
  AVAX: 'https://www.avax.network/whitepaper',
  ADA:  'https://docs.cardano.org/about-cardano/introduction/',
  DOT:  'https://polkadot.network/whitepaper/',
  LINK: 'https://chain.link/whitepaper',
  UNI:  'https://docs.uniswap.org/concepts/overview',
  NEAR: 'https://docs.near.org/concepts/basics/protocol',
  MATIC:'https://polygon.technology/papers/pol-whitepaper',
  INJ:  'https://docs.injective.network/',
  APT:  'https://aptosfoundation.org/whitepaper/aptos-technical-paper',
  SUI:  'https://docs.sui.io/paper/sui.pdf',
};

// Skip PDFs — raw byte extraction produces garbage (font metadata, streams)
const SKIP_EXTENSIONS = ['.pdf'];

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AXIOM/1.0 (Crypto Research)' },
      next: { revalidate: 86400 },
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractFromHtml(html: string, maxChars: number): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxChars);
}

function extractFromMarkdown(md: string, maxChars: number): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxChars);
}

export async function fetchWhitepaperContent(
  symbol: string,
  coingeckoUrl: string | null,
  maxChars = DEFAULT_MAX_CHARS,
): Promise<string | null> {
  const upper = symbol.toUpperCase();
  const urls: string[] = [];

  // Prefer known HTML docs over CoinGecko URL (which is often a PDF)
  if (HTML_DOCS[upper]) urls.push(HTML_DOCS[upper]);
  if (coingeckoUrl && !urls.includes(coingeckoUrl)) urls.push(coingeckoUrl);

  for (const url of urls) {
    // Skip PDFs — raw binary extraction produces garbage
    const lowerUrl = url.toLowerCase();
    if (SKIP_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) continue;

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;

      const ct = res.headers.get('content-type') ?? '';

      // Skip PDF responses even if URL doesn't end in .pdf
      if (ct.includes('application/pdf')) continue;

      const text = await res.text();

      if (url.endsWith('.md') || ct.includes('text/plain')) {
        const extracted = extractFromMarkdown(text, maxChars);
        if (extracted.length > 150) return extracted;
        continue;
      }

      const extracted = extractFromHtml(text, maxChars);
      if (extracted.length > 150) return extracted;
    } catch {
      // Timeout or network error — try next URL
    }
  }

  return null;
}
