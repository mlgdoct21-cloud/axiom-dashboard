import { NextRequest, NextResponse } from 'next/server';
import { getActiveSources, type NewsItem, type NewsCategory } from '@/lib/news-sources';

/**
 * News Aggregator API
 *
 * GET /api/news
 * GET /api/news?category=crypto
 * GET /api/news?q=bitcoin
 * GET /api/news?symbol=AAPL
 * GET /api/news?limit=50
 *
 * Tum aktif kaynaklardan paralel haber ceker, dedup eder, sort eder.
 * Next.js'in built-in fetch cache'ini kullanir (5dk revalidate).
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get('category') as NewsCategory | null;
  const query = params.get('q')?.toLowerCase() || '';
  const symbol = params.get('symbol')?.toUpperCase() || '';
  const limit = Math.min(parseInt(params.get('limit') || '100', 10), 200);

  try {
    const sources = getActiveSources();

    // Paralel fetch — bir kaynak yavas/down olsa bile digerleri gelir
    const results = await Promise.allSettled(
      sources.map(source => source.fetch())
    );

    let allNews: NewsItem[] = [];
    const sourceStats: Record<string, number> = {};

    results.forEach((result, idx) => {
      const sourceId = sources[idx].id;
      if (result.status === 'fulfilled') {
        allNews.push(...result.value);
        sourceStats[sourceId] = result.value.length;
      } else {
        sourceStats[sourceId] = 0;
      }
    });

    // Dedup — url bazli (ayni haber birden fazla kaynakta olabilir)
    const seen = new Set<string>();
    allNews = allNews.filter(n => {
      const key = n.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filtreleme
    if (category && category !== 'general') {
      allNews = allNews.filter(n => n.category === category);
    }

    if (query) {
      allNews = allNews.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.summary.toLowerCase().includes(query)
      );
    }

    if (symbol) {
      allNews = allNews.filter(n =>
        n.symbols?.some(s => s.toUpperCase().includes(symbol)) ||
        n.title.toUpperCase().includes(symbol)
      );
    }

    // Yeniden eskiye sirala
    allNews.sort((a, b) => b.publishedAt - a.publishedAt);

    // Limitleme
    allNews = allNews.slice(0, limit);

    return NextResponse.json({
      count: allNews.length,
      sources: sourceStats,
      news: allNews,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error('News aggregator error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', news: [] },
      { status: 500 }
    );
  }
}
