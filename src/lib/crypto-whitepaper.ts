const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_MAX_CHARS = 4000;

// Prefer GitHub raw markdown for known projects (clean, no HTML noise)
const GITHUB_WP: Record<string, string> = {
  ETH:  'https://raw.githubusercontent.com/ethereum/wiki/master/White-Paper.md',
  BTC:  'https://raw.githubusercontent.com/bitcoin/bitcoin.org/master/bitcoin.pdf',
};

// HTML whitepaper pages for known projects
const HTML_OVERRIDES: Record<string, string> = {
  ETH:  'https://ethereum.org/en/whitepaper/',
};

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxChars);
}

// Rough PDF text extraction — reads visible ASCII runs from raw bytes
function extractFromPdfBytes(buffer: ArrayBuffer, maxChars: number): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  let current = '';

  for (let i = 0; i < bytes.length && chunks.join(' ').length < maxChars * 2; i++) {
    const ch = bytes[i];
    if (ch >= 32 && ch <= 126) {
      current += String.fromCharCode(ch);
    } else {
      if (current.length > 4) chunks.push(current.trim());
      current = '';
    }
  }
  if (current.length > 4) chunks.push(current.trim());

  const words = chunks
    .join(' ')
    .replace(/\b[0-9a-fA-F]{8,}\b/g, ' ')
    .replace(/\/[A-Za-z]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const alphabetic = (words.match(/[a-zA-Z]/g) ?? []).length;
  return alphabetic > 200 ? words.slice(0, maxChars) : '';
}

export async function fetchWhitepaperContent(
  symbol: string,
  coingeckoUrl: string | null,
  maxChars = DEFAULT_MAX_CHARS,
): Promise<string | null> {
  const upper = symbol.toUpperCase();
  const urls: string[] = [];

  // Priority: GitHub raw markdown > HTML override > CoinGecko URL
  if (GITHUB_WP[upper]) urls.push(GITHUB_WP[upper]);
  if (HTML_OVERRIDES[upper]) urls.push(HTML_OVERRIDES[upper]);
  if (coingeckoUrl && !urls.includes(coingeckoUrl)) urls.push(coingeckoUrl);

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;

      const ct = res.headers.get('content-type') ?? '';

      if (ct.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
        const buf = await res.arrayBuffer();
        const text = extractFromPdfBytes(buf, maxChars);
        if (text.length > 200) return text;
        continue;
      }

      const text = await res.text();

      if (url.endsWith('.md') || ct.includes('text/plain')) {
        const extracted = extractFromMarkdown(text, maxChars);
        if (extracted.length > 100) return extracted;
        continue;
      }

      const extracted = extractFromHtml(text, maxChars);
      if (extracted.length > 100) return extracted;
    } catch {
      // Timeout or network error — try next URL
    }
  }

  return null;
}
