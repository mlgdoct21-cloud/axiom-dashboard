/**
 * Macro Latest Proxy — Backend `/api/v1/macro/latest` endpoint'ine proxy.
 *
 * GET /api/macro/latest
 * Returns: { now, release: { event_id, event_type, narrative_md, sentiment_score, ... } | null }
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(_request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const url = `${backendUrl}/macro/latest`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Backend already sends Cache-Control public 60s; keep edge SWR aligned.
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('[macro/latest] Backend error:', response.status, url);
      return NextResponse.json(
        { error: `Backend returned ${response.status}`, release: null },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[macro/latest] Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch macro latest', release: null },
      { status: 500 },
    );
  }
}
