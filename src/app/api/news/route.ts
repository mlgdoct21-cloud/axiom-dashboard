import { NextRequest, NextResponse } from 'next/server';

// Axiom backend base. Örn: https://vivacious-growth-production-4875.up.railway.app/api/v1
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(params.get('limit') || '30', 10), 100);
  const beforeId = params.get('before_id'); // infinite scroll cursor

  // /news/feed = analizi tamamlanmış (analyzed=True) haberler, id DESC.
  const q = new URLSearchParams({ limit: String(limit) });
  if (beforeId) q.set('before_id', beforeId);
  const targetUrl = `${BACKEND_URL}/news/feed?${q.toString()}`;

  try {
    const res = await fetch(targetUrl, {
      // Kısa cache + stale-while-revalidate efekti için revalidate.
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }

    const backendNews = await res.json();

    // Backend NewsItem → Frontend NewsTab.NewsItem dönüşümü.
    const allNews = backendNews.map((n: any) => ({
      id: String(n.id),
      title: n.original_title,
      summary: n.dashboard_summary || n.ai_summary || '',
      source: n.source,
      category: 'general',
      url: n.original_link,
      publishedAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
      symbols: n.symbol ? [n.symbol] : undefined,
      telegram_hook: n.telegram_hook || '',
      dashboard_summary: n.dashboard_summary || '',
      axiom_analysis: n.axiom_analysis || '',
    }));

    return NextResponse.json({
      count: allNews.length,
      sources: {},
      news: allNews,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error('News proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news from backend', news: [] },
      { status: 500 }
    );
  }
}
