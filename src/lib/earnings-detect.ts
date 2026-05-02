/**
 * Earnings detection — extract the most recently REPORTED quarter from an
 * FMP `/earnings` response so insider-report and deep-analysis can mark it
 * as "fresh" (within last 7 days) and force prompts to discuss it explicitly.
 *
 * FMP `/earnings` returns rows like:
 *   { date: '2026-04-30', epsActual: 1.65, epsEstimated: 1.62,
 *     revenueActual: 95800000000, revenueEstimated: 95100000000, ... }
 *
 * Future quarters have epsActual=null. We pick the FIRST row with epsActual
 * set as "the latest reported quarter".
 */
export type LatestReportedQuarter = {
  date: string;            // YYYY-MM-DD
  daysAgo: number;
  isFresh: boolean;        // daysAgo <= FRESH_WINDOW_DAYS
  epsActual: number | null;
  epsEstimated: number | null;
  surprisePct: number | null;
  revenue: number | null;
  revenueEstimated: number | null;
  revenueSurprisePct: number | null;
};

export const FRESH_WINDOW_DAYS = 7;

export function extractLatestReportedQuarter(
  fmpEarnings: unknown,
  now: Date = new Date(),
): LatestReportedQuarter | null {
  if (!Array.isArray(fmpEarnings) || fmpEarnings.length === 0) return null;

  const reported = fmpEarnings
    .filter((r: any) => r && r.epsActual != null && r.date)
    .sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  const latest = reported[0];
  if (!latest) return null;

  const reportDate = new Date(latest.date);
  const daysAgo = Math.floor(
    (now.getTime() - reportDate.getTime()) / (24 * 3600 * 1000),
  );

  const epsActual = Number(latest.epsActual);
  const epsEstimated =
    latest.epsEstimated != null ? Number(latest.epsEstimated) : null;
  const surprisePct =
    epsEstimated != null && epsEstimated !== 0
      ? Number((((epsActual - epsEstimated) / Math.abs(epsEstimated)) * 100).toFixed(2))
      : null;

  const revenue =
    latest.revenueActual != null ? Number(latest.revenueActual) : null;
  const revenueEstimated =
    latest.revenueEstimated != null ? Number(latest.revenueEstimated) : null;
  const revenueSurprisePct =
    revenue != null && revenueEstimated != null && revenueEstimated !== 0
      ? Number((((revenue - revenueEstimated) / Math.abs(revenueEstimated)) * 100).toFixed(2))
      : null;

  return {
    date: String(latest.date).slice(0, 10),
    daysAgo,
    isFresh: daysAgo >= 0 && daysAgo <= FRESH_WINDOW_DAYS,
    epsActual,
    epsEstimated,
    surprisePct,
    revenue,
    revenueEstimated,
    revenueSurprisePct,
  };
}
