import { NextRequest, NextResponse } from 'next/server';

/**
 * AXIOM Market Analysis — Contextual AI Analysis
 *
 * POST /api/analysis/market
 *
 * Analyzes a news item considering:
 * - Current symbol prices + 24h change
 * - Market sentiment (from votes)
 * - Related news trends
 * - Broader market context (indices)
 *
 * Returns comprehensive market impact analysis
 */

interface AnalysisRequest {
  newsId: string;
  title: string;
  summary: string;
  symbols?: string[];
  bullish?: number;
  bearish?: number;
  panic?: number;
  locale: 'en' | 'tr';
}

interface PriceContext {
  symbol: string;
  price: number;
  change24h: number;
  changePercent: number;
}

async function fetchSymbolPrices(symbols: string[]): Promise<PriceContext[]> {
  if (symbols.length === 0) return [];

  try {
    const params = new URLSearchParams({ symbols: symbols.join(',') });
    const res = await fetch(`http://localhost:3000/api/quote?${params}`, {
      next: { revalidate: 10 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.quotes || []).map((q: any) => ({
      symbol: q.symbol,
      price: q.price,
      change24h: q.change,
      changePercent: q.changePercent,
    }));
  } catch (e) {
    console.error('[analysis/prices]', e);
    return [];
  }
}

async function generateMarketAnalysis(request: AnalysisRequest, prices: PriceContext[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[analysis] Missing GEMINI_API_KEY');
    return '';
  }

  const sentimentTotal = (request.bullish || 0) + (request.bearish || 0) + (request.panic || 0);
  const bullishPct = sentimentTotal > 0 ? Math.round(((request.bullish || 0) / sentimentTotal) * 100) : 0;
  const bearishPct = sentimentTotal > 0 ? Math.round(((request.bearish || 0) / sentimentTotal) * 100) : 0;
  const panicPct = sentimentTotal > 0 ? Math.round(((request.panic || 0) / sentimentTotal) * 100) : 0;

  const priceContext = prices
    .map(
      p =>
        `${p.symbol}: $${p.price.toFixed(2)} (${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(2)}% in 24h)`
    )
    .join('\n');

  const prompt =
    request.locale === 'tr'
      ? `Bir finansal haberinin pazar etkisini analiz et. Tüm piyasa koşullarını göz önünde alarak kısa ve açık bir yorum yap.

HABER:
Başlık: "${request.title}"
Özet: "${request.summary}"

İLGİLİ SEMBÖLLERİN MEVCUT DURUM:
${priceContext || 'Sembol verisi yok'}

TOPLUM SESTİMENTİ:
- Yükseliş (Bullish): ${bullishPct}%
- Düşüş (Bearish): ${bearishPct}%
- Panik: ${panicPct}%

SORULAR:
1. Bu haberden ETKİLENEBİLECEK sektörler/semboller nelerdir?
2. Kısa vadede (24h) ne gibi fiyat hareketi bekleniyor? Neden?
3. Bu haberle ilgili RİSK ve FIRASAT nedir?
4. Yatırımcılar ne yapmalı? (Cautious/Action)

2-3 paragraf halinde, yapılandırılmış analiz yap.`
      : `Analyze the market impact of this financial news. Consider broader market conditions and provide a concise, actionable analysis.

NEWS:
Title: "${request.title}"
Summary: "${request.summary}"

CURRENT SYMBOL STATUS:
${priceContext || 'No symbol data'}

COMMUNITY SENTIMENT:
- Bullish: ${bullishPct}%
- Bearish: ${bearishPct}%
- Panic: ${panicPct}%

ANALYZE:
1. What sectors/symbols will be MOST AFFECTED by this news?
2. What price movements do you expect in 24h? Why?
3. What are the RISKS and OPPORTUNITIES?
4. Investment stance? (Cautious/Action)

Provide structured, actionable analysis in 2-3 paragraphs.`;

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      if (response.status === 429) {
        console.warn(`[analysis] Rate limited (429), attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)));
          continue;
        }
      } else {
        const error = await response.json().catch(() => ({}));
        console.error(`[analysis] Status ${response.status}:`, error);
        return '';
      }
    } catch (e) {
      console.error(`[analysis] Fetch error (attempt ${attempt + 1}):`, e);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)));
      }
    }
  }

  return '';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalysisRequest;

    // Fetch current prices for symbols
    const prices = await fetchSymbolPrices(body.symbols || []);

    // Generate analysis with Gemini
    const analysis = await generateMarketAnalysis(body, prices);

    return NextResponse.json({
      analysis,
      prices,
      sentiment: {
        bullish: body.bullish || 0,
        bearish: body.bearish || 0,
        panic: body.panic || 0,
      },
      success: !!analysis,
    });
  } catch (e) {
    console.error('[analysis]', e);
    return NextResponse.json(
      { error: 'Failed to generate analysis', analysis: '' },
      { status: 500 }
    );
  }
}
