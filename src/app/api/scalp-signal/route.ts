import { NextRequest, NextResponse } from 'next/server';
import {
  calculateRSI,
  calculateMACD,
  calculateBollinger,
  calculateStochastic,
  calculateATR,
  calculateSupportResistance,
  calculateFibonacci,
  type ChartPoint,
} from '@/lib/finnhub';

/**
 * AXIOM Scalp Signal — Gemini destekli BUY/SELL/HOLD sinyali
 *
 * POST /api/scalp-signal
 * Body: { symbol, timeframe, candles, tier? }
 *
 * Tier limitleri (auth gelene kadar IP bazli):
 *   free      → 1  istek / 24s
 *   premium   → 5  istek / 24s
 *   advance   → sinirsiz
 */

type Tier = 'free' | 'premium' | 'advance';

const TIER_LIMITS: Record<Tier, number> = {
  free: 1,
  premium: 5,
  advance: Number.POSITIVE_INFINITY,
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

// In-memory rate limit store. PROD → Redis/Upstash. Anahtar: `${ip}:${tier}`
const rateStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string, tier: Tier): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = TIER_LIMITS[tier];
  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }
  const key = `${ip}:${tier}`;
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ──────────────────────────────────────────────────────────────────────────────
// Indikator ozetle (Gemini'ye verilecek kompakt JSON)
// ──────────────────────────────────────────────────────────────────────────────

function last<T>(arr: T[]): T | undefined { return arr[arr.length - 1]; }

function summarizeIndicators(candles: ChartPoint[]) {
  const rsi = calculateRSI(candles);
  const macd = calculateMACD(candles);
  const bb = calculateBollinger(candles);
  const stoch = calculateStochastic(candles);
  const atr = calculateATR(candles);
  const sr = calculateSupportResistance(candles);
  const fib = calculateFibonacci(candles);

  const lastCandle = last(candles)!;
  const prev = candles[candles.length - 2];

  const rsiLast = last(rsi)?.value ?? null;
  const rsiPrev = rsi[rsi.length - 2]?.value ?? null;
  const macdLast = last(macd);
  const macdPrev = macd[macd.length - 2];
  const bbLast = last(bb);
  const stochLast = last(stoch);
  const atrLast = last(atr)?.value ?? null;

  // 20 bar'lik hacim ortalamasina gore son mum hacmi
  const volLookback = Math.min(20, candles.length);
  const avgVol = candles.slice(-volLookback).reduce((s, c) => s + (c.volume || 0), 0) / volLookback;
  const volRatio = avgVol > 0 ? (lastCandle.volume || 0) / avgVol : 1;

  // Kisa vadeli momentum: son 5 ve 20 mum getiri
  const ret = (n: number) =>
    candles.length > n
      ? (lastCandle.close - candles[candles.length - 1 - n].close) / candles[candles.length - 1 - n].close
      : 0;

  return {
    price: {
      current: lastCandle.close,
      change_1bar_pct: prev ? ((lastCandle.close - prev.close) / prev.close) * 100 : 0,
      change_5bar_pct: ret(5) * 100,
      change_20bar_pct: ret(20) * 100,
      high_20bar: Math.max(...candles.slice(-20).map(c => c.high)),
      low_20bar: Math.min(...candles.slice(-20).map(c => c.low)),
    },
    rsi: {
      value: rsiLast,
      prev: rsiPrev,
      state:
        rsiLast == null ? 'n/a'
        : rsiLast >= 70 ? 'overbought'
        : rsiLast <= 30 ? 'oversold'
        : rsiLast >= 55 ? 'bullish'
        : rsiLast <= 45 ? 'bearish'
        : 'neutral',
      divergence_hint: rsiLast != null && rsiPrev != null && prev
        ? (lastCandle.close > prev.close && rsiLast < rsiPrev) ? 'bearish_divergence_possible'
          : (lastCandle.close < prev.close && rsiLast > rsiPrev) ? 'bullish_divergence_possible'
          : 'none'
        : 'none',
    },
    macd: macdLast ? {
      macd: macdLast.macd,
      signal: macdLast.signal,
      histogram: macdLast.histogram,
      cross: macdPrev
        ? (macdPrev.macd <= macdPrev.signal && macdLast.macd > macdLast.signal) ? 'bullish_cross'
          : (macdPrev.macd >= macdPrev.signal && macdLast.macd < macdLast.signal) ? 'bearish_cross'
          : 'none'
        : 'none',
      histogram_trend: macdPrev
        ? (macdLast.histogram > macdPrev.histogram ? 'rising' : 'falling')
        : 'n/a',
    } : null,
    bollinger: bbLast ? {
      upper: bbLast.upper,
      middle: bbLast.middle,
      lower: bbLast.lower,
      percent_b: (lastCandle.close - bbLast.lower) / (bbLast.upper - bbLast.lower),
      band_width_pct: ((bbLast.upper - bbLast.lower) / bbLast.middle) * 100,
      position:
        lastCandle.close > bbLast.upper ? 'above_upper'
        : lastCandle.close < bbLast.lower ? 'below_lower'
        : lastCandle.close > bbLast.middle ? 'upper_half'
        : 'lower_half',
    } : null,
    stochastic: stochLast ? {
      k: stochLast.k,
      d: stochLast.d,
      state:
        stochLast.k >= 80 ? 'overbought'
        : stochLast.k <= 20 ? 'oversold'
        : 'neutral',
      cross: stoch.length >= 2
        ? (stoch[stoch.length - 2].k <= stoch[stoch.length - 2].d && stochLast.k > stochLast.d) ? 'bullish_cross'
          : (stoch[stoch.length - 2].k >= stoch[stoch.length - 2].d && stochLast.k < stochLast.d) ? 'bearish_cross'
          : 'none'
        : 'none',
    } : null,
    atr: {
      value: atrLast,
      // ATR'nin fiyata orani (volatilite yuzdesi)
      pct_of_price: atrLast != null ? (atrLast / lastCandle.close) * 100 : null,
    },
    volume: {
      last: lastCandle.volume,
      avg_20: avgVol,
      ratio: volRatio,
      state: volRatio >= 1.5 ? 'high' : volRatio <= 0.7 ? 'low' : 'normal',
    },
    support_resistance: sr ? {
      supports: sr.supports.map(s => ({
        price: s.price, touches: s.touches, strength: s.strength,
        distance_pct: ((lastCandle.close - s.price) / lastCandle.close) * 100,
      })),
      resistances: sr.resistances.map(r => ({
        price: r.price, touches: r.touches, strength: r.strength,
        distance_pct: ((r.price - lastCandle.close) / lastCandle.close) * 100,
      })),
      trendline: sr.trendline ? {
        direction: sr.trendline.direction,
        r2: sr.trendline.r2,
        projected_end_price: sr.trendline.endPrice,
        pivot_count: sr.trendline.pivotCount,
      } : null,
    } : null,
    fibonacci: fib ? {
      swing_high: fib.highPrice,
      swing_low: fib.lowPrice,
      levels: fib.levels.map(l => ({ label: l.label, price: l.price })),
    } : null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Gemini prompt — AXIOM Scalp Desk Analyst
// ──────────────────────────────────────────────────────────────────────────────

function buildPrompt(symbol: string, timeframe: string, ind: ReturnType<typeof summarizeIndicators>, locale: 'tr' | 'en'): string {
  const langRule = locale === 'tr'
    ? 'TUM metinsel alanlar (rationale, key_signals, invalidation, warnings) TURKCE yazilmalidir. Sembol adi, sayilar ve "BUY/SELL/HOLD/TP1" gibi teknik terimler aynen kalabilir.'
    : 'ALL text fields (rationale, key_signals, invalidation, warnings) MUST be written in ENGLISH. Symbol names, numbers, and technical terms like BUY/SELL/HOLD/TP1 stay as-is.';

  return `You are "AXIOM Scalp Desk Analyst" — a senior proprietary-desk trader with 15 years of experience in crypto and equities scalping & intraday trading. You are RISK-FIRST, SYSTEMATIC, and never trade on hope.

═══════════════════════════════════════════════════════════════
LANGUAGE
═══════════════════════════════════════════════════════════════
${langRule}

═══════════════════════════════════════════════════════════════
ROLE & HARD RULES
═══════════════════════════════════════════════════════════════
1. You ONLY use the indicator snapshot provided below. You do NOT invent price levels, news, fundamentals, or macro context.
2. If the signals are mixed or weak → you OUTPUT action="HOLD". Refusing to signal is correct behavior, not failure.
3. Every actionable signal (BUY/SELL) MUST include: entry zone, stop-loss, at least one target, risk-reward ratio, and a clear invalidation condition.
4. Minimum risk-reward for any BUY/SELL: 1.5. If you cannot justify 1.5 R:R from the provided S/R levels → HOLD.
5. Stop-loss MUST be placed on the OTHER side of the nearest structural level (S/R or ATR-based). Never inside the noise band.
6. You speak plain, decisive English or Turkish (match the locale field). No hedging filler. State your edge, state the risk, stop.

═══════════════════════════════════════════════════════════════
DECISION FRAMEWORK — Confluence Matrix
═══════════════════════════════════════════════════════════════
Score each dimension (−2 to +2, negative = bearish, positive = bullish):
  A) TREND        — MACD cross/histogram direction, trendline direction & R², 20-bar price change
  B) MOMENTUM     — RSI state + direction, Stochastic cross/state
  C) STRUCTURE    — Price vs nearest support/resistance, Bollinger position, Fibonacci
  D) VOLUME       — Last-bar volume ratio vs 20-bar average (confirms moves)
  E) VOLATILITY   — ATR % of price (too low = no move, too high = chop risk)

Aggregate score:
  ≥ +5 and volume confirms           → strong BUY
  +2 to +4 with confluence           → cautious BUY
  −2 to +1                           → HOLD
  −4 to −2 with confluence           → cautious SELL
  ≤ −5 and volume confirms           → strong SELL

═══════════════════════════════════════════════════════════════
ENTRY / STOP / TARGET CONSTRUCTION
═══════════════════════════════════════════════════════════════
• For BUY: entry near current price or upper support; stop = min(nearest support − 0.5×ATR, current − 1.5×ATR); TP1 = nearest resistance, TP2 = next resistance OR current + 2–3×ATR.
• For SELL: mirror logic with resistances.
• Reject the trade (return HOLD) if:
    – No support/resistance within reasonable distance (< 3×ATR), OR
    – ATR % of price < 0.3 (too dead), OR
    – Bollinger band width < 1% on intraday timeframes (squeeze — wait for break), OR
    – Indicators contradict each other strongly.

═══════════════════════════════════════════════════════════════
INPUT — Indicator Snapshot
═══════════════════════════════════════════════════════════════
Symbol: ${symbol}
Timeframe: ${timeframe}
Indicators (live snapshot, computed from real OHLCV):

${JSON.stringify(ind, null, 2)}

═══════════════════════════════════════════════════════════════
OUTPUT — Strict JSON (no markdown, no prose outside JSON)
═══════════════════════════════════════════════════════════════
Return exactly this schema (all string values in ${locale === 'tr' ? 'TURKISH' : 'ENGLISH'}):

{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "horizon": "scalp" | "intraday" | "swing",
  "entry": { "price": number, "zone_low": number, "zone_high": number } | null,
  "stop_loss": number | null,
  "targets": [ { "price": number, "rr": number, "label": "TP1" | "TP2" | "TP3" } ],
  "risk_reward": number | null,
  "confluence_score": { "trend": number, "momentum": number, "structure": number, "volume": number, "volatility": number, "total": number },
  "rationale": "2-4 sentences, decisive",
  "key_signals": ["short bullet", "..."],
  "invalidation": "Conditions that invalidate this signal, e.g. 15m close below 118.50",
  "warnings": ["optional risk note"],
  "data_sufficient": true | false
}

If data is insufficient or indicators are too conflicting to trade, set action="HOLD", entry/stop/targets=null/[], and explain in rationale.
Confidence reflects ONLY the quality of the signal given the data — NOT a prediction certainty.

Return the JSON now. No markdown fences, no extra text.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Route handler
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { symbol, timeframe, candles, tier: rawTier, locale: rawLocale } = body ?? {};
    const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';

    if (!symbol || !timeframe || !Array.isArray(candles) || candles.length < 40) {
      return NextResponse.json(
        { error: 'symbol, timeframe ve candles (en az 40 bar) gereklidir' },
        { status: 400 }
      );
    }

    const validTiers: readonly Tier[] = ['free', 'premium', 'advance'];
    const tier: Tier = validTiers.includes(rawTier as Tier) ? (rawTier as Tier) : 'free';

    const ip = getClientIp(request);
    const rate = checkRateLimit(ip, tier);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          tier,
          remaining: 0,
          resetAt: rate.resetAt,
          message:
            tier === 'free'
              ? 'Ucretsiz plan gunde 1 sinyal ile sinirlidir. Premium plana yukseltin.'
              : 'Gunluk sinyal limiti doldu. Advance plana yukseltin.',
        },
        { status: 429 }
      );
    }

    const indicators = summarizeIndicators(candles as ChartPoint[]);
    const prompt = buildPrompt(symbol, timeframe, indicators, locale);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errTxt = await geminiRes.text();
      console.error('[scalp-signal] Gemini HTTP', geminiRes.status, errTxt);
      return NextResponse.json(
        { error: 'AI signal generation failed', gemini_status: geminiRes.status, gemini_detail: errTxt.slice(0, 800) },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const candidate = geminiData?.candidates?.[0];
    const raw = candidate?.content?.parts?.[0]?.text;
    if (!raw) {
      console.error('[scalp-signal] Empty AI response', JSON.stringify(geminiData).slice(0, 1000));
      return NextResponse.json(
        {
          error: 'Empty AI response',
          finish_reason: candidate?.finishReason,
          safety_ratings: candidate?.safetyRatings,
          prompt_feedback: geminiData?.promptFeedback,
        },
        { status: 502 }
      );
    }

    let signal: unknown;
    try {
      signal = JSON.parse(raw);
    } catch {
      console.error('[scalp-signal] JSON parse failed, raw:', raw);
      return NextResponse.json(
        { error: 'AI returned malformed JSON', raw_preview: raw.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      tier,
      rate_limit: {
        remaining: Number.isFinite(rate.remaining) ? rate.remaining : null,
        resetAt: rate.resetAt || null,
      },
      indicators,
      signal,
      generated_at: Date.now(),
    });
  } catch (e) {
    console.error('[scalp-signal]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
