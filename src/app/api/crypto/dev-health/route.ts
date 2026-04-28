import { NextRequest, NextResponse } from 'next/server';
import { getDevHealthMetrics } from '@/lib/crypto-github';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol parameter required' },
      { status: 400 }
    );
  }

  // Check cache first (6h TTL)
  const cached = await getCachedCryptoReport('dev_health', symbol);
  if (cached) {
    return NextResponse.json({
      ...cached,
      cached: true,
      cacheSource: 'supabase'
    });
  }

  try {
    // Fetch fresh data
    const devMetrics = await getDevHealthMetrics(symbol);

    if (!devMetrics) {
      return NextResponse.json(
        { error: `No GitHub repo found for ${symbol}` },
        { status: 404 }
      );
    }

    // Score dev health (0-100)
    const score = calculateDevHealthScore(devMetrics);

    // Detect red flags
    const redFlags = detectRedFlags(devMetrics);

    const result = {
      symbol,
      dev_health: {
        score,
        metrics: devMetrics,
        red_flags: redFlags,
        trend: calculateTrend(devMetrics),
        timestamp: new Date().toISOString()
      },
      cached: false,
      cacheSource: 'github'
    };

    // Cache result
    await setCachedCryptoReport('dev_health', symbol, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dev health endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dev health metrics' },
      { status: 500 }
    );
  }
}

function calculateDevHealthScore(metrics: any): number {
  let score = 50; // baseline

  // Commits (max +30)
  score += Math.min(metrics.commits_30d / 5, 30);

  // Developers (max +20)
  score += Math.min(metrics.active_developers / 2, 20);

  // PR activity (max +15)
  score += Math.min(metrics.recent_prs / 3, 15);

  // Review speed (max +10)
  if (metrics.avg_pr_review_time < 24) score += 10;
  else if (metrics.avg_pr_review_time < 72) score += 5;

  return Math.min(score, 100);
}

function detectRedFlags(metrics: any): string[] {
  const flags = [];

  if (metrics.commits_30d < 10) flags.push('Very low commit activity');
  if (metrics.active_developers < 3) flags.push('Small developer team');
  if (metrics.recent_prs === 0) flags.push('No recent PRs (stagnant)');
  if (metrics.avg_pr_review_time > 168) flags.push('Slow PR review process');

  return flags;
}

function calculateTrend(metrics: any): 'up' | 'down' | 'stable' {
  // This would compare with previous period
  // For now, placeholder
  return 'stable';
}
