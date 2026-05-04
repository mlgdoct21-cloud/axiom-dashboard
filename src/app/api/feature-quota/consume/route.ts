/**
 * Quota consume proxy — JWT-auth backend endpoint forwarder.
 * Frontend hook calls POST /api/feature-quota/consume {command};
 * Authorization header is taken from the request's localStorage-backed
 * client (forwarded transparently).
 */
import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_URL = 'https://vivacious-growth-production-4875.up.railway.app/api/v1';

export async function POST(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL;

  const auth = request.headers.get('authorization') || '';
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const r = await fetch(`${backendUrl}/feature-quota/consume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'fetch_failed' }, { status: 500 });
  }
}
