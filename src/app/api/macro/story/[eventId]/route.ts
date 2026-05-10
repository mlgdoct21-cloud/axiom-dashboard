/**
 * Macro Storyteller Proxy — Backend `/api/v1/macro/story/{event_id}` proxy.
 *
 * Authorization Bearer header forwarded so backend can identify tier
 * (anonymous → 'free' preview, premium/advance → full story).
 *
 * Backend response shape:
 * {
 *   event_id, tier_active: 'free'|'premium'|'advance',
 *   event_type, country, released_at,
 *   narrative_md: string,   // Free hap, her tier'da görünür
 *   source_url: string,
 *   story: { tier, story_md, generated_at, sources_cited, sources_registry } | null,
 *   upgrade_cta: { target_tier, reason } | null
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;
  const url = `${backendUrl}/macro/story/${encodeURIComponent(eventId)}`;

  // Forward Authorization header if present (tier gating)
  const authHeader = request.headers.get('authorization');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      console.error('[macro/story] Backend error:', response.status, url);
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Tier-dependent — short browser cache, edge SWR 5 min
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('[macro/story] Fetch failed:', err);
    return NextResponse.json(
      { error: 'fetch_failed' },
      { status: 500 },
    );
  }
}
