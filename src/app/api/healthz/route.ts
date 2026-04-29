import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    api_url_set: Boolean(process.env.NEXT_PUBLIC_API_URL),
    api_url_len: process.env.NEXT_PUBLIC_API_URL?.length ?? 0,
    finnhub_set: Boolean(process.env.NEXT_PUBLIC_FINNHUB_API_KEY),
    finnhub_len: process.env.NEXT_PUBLIC_FINNHUB_API_KEY?.length ?? 0,
    gemini_set: Boolean(process.env.GEMINI_API_KEY),
    gemini_len: process.env.GEMINI_API_KEY?.length ?? 0,
    deploy_id: process.env.VERCEL_DEPLOYMENT_ID || null,
    git_commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    timestamp: Date.now(),
  });
}
