import { NextRequest, NextResponse } from 'next/server';

/**
 * Stock Symbol Search
 * GET /api/stock/search?q=AAPL
 *
 * Uses Finnhub /stock/symbol endpoint for US & TR symbols
 */

interface FinnhubSymbol {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

async function searchFinnhub(query: string): Promise<any[]> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL('https://finnhub.io/api/v1/search');
    url.searchParams.set('q', query);
    url.searchParams.set('token', apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 86400 }, // 24h cache
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = (data.result || []) as FinnhubSymbol[];

    // Filter: Only stocks + common ETFs (exclude microcaps)
    return results
      .filter(
        r =>
          (r.type === 'Common Stock' || r.type === 'ETF') &&
          r.symbol.length <= 5 // Reasonable symbol length
      )
      .slice(0, 10) // Top 10 results
      .map(r => ({
        symbol: r.symbol,
        name: r.description,
        displaySymbol: r.displaySymbol,
        type: r.type,
      }));
  } catch (e) {
    console.error('[stock/search]', e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.toUpperCase().trim();

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchFinnhub(query);

    return NextResponse.json({
      results,
      count: results.length,
      query,
    });
  } catch (e) {
    console.error('[stock/search error]', e);
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}
