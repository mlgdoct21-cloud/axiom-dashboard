import { NextRequest } from 'next/server';

/**
 * SSE Proxy → Backend /api/v1/news/stream
 *
 * Dashboard EventSource bağlanır → Next.js bu endpoint'i aracı olarak kullanır →
 * Railway backend'deki FastAPI SSE kanalına bağlanır → gelen eventleri aynen forward eder.
 *
 * Neden proxy? Backend farklı bir origin'de (Railway); CORS ve cookie edge-case'lerini
 * aşmak için Next.js aynı origin'den SSE sunar. Ayrıca gerekirse aranecelik header /
 * auth ekleyebiliriz.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET(request: NextRequest) {
  const upstream = `${BACKEND_URL}/news/stream`;

  const controller = new AbortController();
  // Client abort → upstream abort (don't leave dangling socket).
  request.signal.addEventListener('abort', () => controller.abort(), { once: true });

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
      // SSE için cache YOK.
      cache: 'no-store',
    });
  } catch (err) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: 'upstream_unreachable' })}\n\n`,
      {
        status: 502,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
        },
      }
    );
  }

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: 'upstream_error', status: upstreamRes.status })}\n\n`,
      {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
        },
      }
    );
  }

  // Doğrudan stream'i forward et.
  return new Response(upstreamRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
