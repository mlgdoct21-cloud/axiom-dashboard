/**
 * Quota summary proxy — JWT-auth backend forwarder.
 * Frontend hook calls GET /api/feature-quota/summary; Authorization
 * header is taken from the request (forwarded transparently).
 */
import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  const auth = request.headers.get('authorization') || '';

  try {
    const r = await fetch(`${backendUrl}/feature-quota/summary`, {
      method: 'GET',
      headers: {
        ...(auth ? { Authorization: auth } : {}),
      },
      cache: 'no-store',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'fetch_failed' }, { status: 500 });
  }
}
