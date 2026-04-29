import { NextResponse } from 'next/server';

export async function GET() {
  const envs = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '<empty>',
    NEXT_PUBLIC_FINNHUB_API_KEY_set: Boolean(process.env.NEXT_PUBLIC_FINNHUB_API_KEY),
    NEXT_PUBLIC_FINNHUB_API_KEY_len: process.env.NEXT_PUBLIC_FINNHUB_API_KEY?.length ?? 0,
    GEMINI_API_KEY_set: Boolean(process.env.GEMINI_API_KEY),
    GEMINI_API_KEY_len: process.env.GEMINI_API_KEY?.length ?? 0,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '<empty>',
  };

  // Try fetching Railway directly from Vercel function
  let railwayTest: any = { ok: false };
  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/news/feed?limit=1`;
    railwayTest.url = url;
    const r = await fetch(url, { cache: 'no-store' });
    railwayTest.status = r.status;
    railwayTest.ok = r.ok;
  } catch (e: any) {
    railwayTest.error = String(e?.message ?? e);
  }

  // Try Finnhub
  let finnhubTest: any = { ok: false };
  try {
    const key = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`, { cache: 'no-store' });
    finnhubTest.status = r.status;
    finnhubTest.ok = r.ok;
    if (r.ok) {
      const data = await r.json();
      finnhubTest.price = data.c;
    } else {
      finnhubTest.body = (await r.text()).slice(0, 200);
    }
  } catch (e: any) {
    finnhubTest.error = String(e?.message ?? e);
  }

  return NextResponse.json({ envs, railwayTest, finnhubTest });
}
