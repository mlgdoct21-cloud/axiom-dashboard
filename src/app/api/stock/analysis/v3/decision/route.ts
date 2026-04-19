import { NextRequest, NextResponse } from 'next/server';
import { calculateRSI, calculateMACD, calculateATR, calculateEMA, calculateSMA } from '@/lib/indicators';
import {
  calculateADX,
  calculateCHOP,
  calculateRSScore,
  detectRegime,
  calculateDataQuality,
  calculateSupportResistance,
  detectTrend,
  calculateVolatilityAdjustment,
} from '@/lib/axiom-v3-indicators';
import {
  calculatePositionSize,
  calculateTrailingStop,
  runStressTest,
  generateRiskAssessment,
  calculateEntryZone,
  calculateConfidenceLevel,
} from '@/lib/axiom-v3-decision';

/**
 * AXIOM v3.0 DECISION ENGINE
 * POST /api/stock/analysis/v3/decision
 *
 * 5-Agent Multi-Factor Analysis System
 * ✅ Agent 1: Fundamental Analysis (0-100)
 * ✅ Agent 2: Macro & Sector Analysis (0-100) with Beta/RS
 * ✅ Agent 3: Technical Analysis (0-100) with Regime Switching
 * ✅ Agent 4: Decision Engine (Dynamic Weighting + Anti-Bias)
 * ✅ Agent 0: Data Quality Gatekeeper
 */

interface V3DecisionRequest {
  symbol: string;
  currentPrice: number;

  // Fundamental data
  fundamentals: {
    pe?: number;
    pb?: number;
    roe?: number;
    debtToEquity?: number;
    fcf?: number;
    fcfGrowth3y?: number;
    eps?: number;
    epsGrowth3y?: number;
    sectorPE?: number;
    sectorROE?: number;
    sectorGrowth?: number;
  };

  // Technical data (OHLC)
  technicals: {
    ohlc: Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
    }>;
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
    bb?: { upper: number; middle: number; lower: number };
  };

  // Macro data
  macro: {
    fedStance?: 'RELAXING' | 'NÖTR' | 'TIGHT';
    inflationStatus?: 'CONTROLLED' | 'HIGH';
    gdpGrowth?: number;
    yieldCurve?: 'POSITIVE' | 'NEUTRAL' | 'INVERTED';
    sectorTailwind?: 'STRONG' | 'NEUTRAL' | 'HEADWIND';
    beta?: number;
    rsScore?: number;
    sentiment?: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  };

  // Data freshness
  dataAge: {
    priceMinutesOld: number;
    sectorHoursOld: number;
    technicalHoursOld: number;
  };

  // Position parameters
  portfolio?: {
    totalValue?: number;
    riskTolerance?: number; // 0.02 = 2%
    maxPosition?: number; // % portfolio
  };

  // Qualitative layer (Agent 5: Corporate Intelligence) — optional
  corporate?: {
    qualitativeScore?: number;       // 0-100 from /api/.../v3/corporate
    analystLabel?: string;            // "BUY" | "HOLD" | "SELL" | "—"
    insiderBuying?: string;           // "POSITIVE" | "NEUTRAL" | "NEGATIVE"
    narrativeSummary?: string;        // short free-text from Gemini
    keyRisks?: string[];              // additional risks from news
    newsCount?: number;
  };

  locale?: 'en' | 'tr';
}

interface V3DecisionResponse {
  symbol: string;
  decision: 'AL' | 'SAT' | 'TUT' | 'İZLE'; // BUY, SELL, HOLD, WATCH
  weightedScore: number; // Final score 0-100

  // Agent Scores
  fundamentalScore: number;
  macroScore: number;
  technicalScore: number;
  dataQualityScore: number;

  // Agent reasoning (transparency)
  fundamentalRationale: string[];
  macroRationale: string[];
  technicalRationale: string[];

  // Weights used in final calculation (sum of first 3 = 1.0, qualitative adjusts ±)
  weights: {
    fundamental: number;
    macro: number;
    technical: number;
    qualitative: number; // adjustment weight (0-0.15)
  };

  // Qualitative layer applied?
  qualitativeScore?: number;        // 0-100 from corporate intel agent
  qualitativeAdjustment?: number;   // signed points added to weighted score (e.g. +4.5)
  decisionNarrative?: string;       // meta-agent synthesis (1-2 paragraphs)

  // Raw inputs summary (what was actually used)
  inputs: {
    pe?: number;
    sectorPE?: number;
    roe?: number;
    sectorROE?: number;
    debtToEquity?: number;
    epsGrowth3y?: number;
    fcf?: number;
    beta: number;
    rs: number;
    fedStance?: string;
    inflationStatus?: string;
    sectorTailwind?: string;
    sentiment?: string;
  };

  // Data source labels (what APIs fed each agent)
  dataSources: {
    price: string;
    fundamentals: string;
    technicals: string;
    macro: string;
  };

  // Regime & Time Horizon
  regime: 'TREND' | 'RANGE' | 'TRANSITION';
  regimeStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  adx: number;
  chop: number;

  // Price Targets & Risk
  entryZone: { lower: number; upper: number };
  targetPrice: number;
  stopLoss: number;
  trailingStopEnabled: boolean;
  riskRewardRatio: number;

  // Position Management
  positionSize: {
    kellyCriterion: number;
    volatilityAdjustment: number;
    varLimit: number;
    finalPosition: number; // % portfolio
    maxDailyLoss: number;
  };

  // Anti-Bias Analysis
  bullCase: string[];
  bearCase: Array<{
    scenario: string;
    trigger: string;
    impact: string;
    probability: number;
  }>;
  worstCase: {
    description: string;
    potentialLoss: number;
    protected: boolean;
  };

  // Stress Test Results
  stressTest: {
    passCount: number;
    failCount: number;
    recommendation: 'PASS' | 'CAUTION' | 'FAIL';
    positionAdjustment: number;
  };

  // Support & Resistance
  support: number[];
  resistance: number[];

  // Final Metrics
  confidenceLevel: number; // 0-10
  caveat: string;
  timestamp: number;
}

// ============================================================================
// AGENT 1: FUNDAMENTAL ANALYSIS
// ============================================================================

function analyzeNazary(fund: V3DecisionRequest['fundamentals']): {
  score: number;
  rationale: string[];
} {
  if (!fund) return { score: 50, rationale: [] };

  const rationale: string[] = [];
  let score = 50;

  // P/E Analysis (40 points)
  if (fund.pe && fund.sectorPE) {
    const peDiff = ((fund.sectorPE - fund.pe) / fund.sectorPE) * 100;

    if (peDiff > 20) {
      score += 8;
      rationale.push(`P/E sektörden %${peDiff.toFixed(0)} düşük (Undervalued)`);
    } else if (peDiff > 0) {
      score += 4;
      rationale.push(`P/E sektöre yakın (Fair)`);
    } else {
      score -= 4;
      rationale.push(`P/E sektörden yüksek (Premium)`);
    }
  }

  // ROE Analysis (30 points)
  if (fund.roe && fund.sectorROE) {
    if (fund.roe > fund.sectorROE * 1.25) {
      score += 10;
      rationale.push(`ROE sektörden %${((fund.roe / fund.sectorROE - 1) * 100).toFixed(0)} yüksek`);
    } else if (fund.roe > fund.sectorROE) {
      score += 5;
      rationale.push(`ROE sektöre yakın`);
    }
  }

  // Debt/Equity (10 points)
  if (fund.debtToEquity && fund.debtToEquity < 0.8) {
    score += 5;
    rationale.push(`D/E ratio sağlıklı (${fund.debtToEquity.toFixed(2)})`);
  }

  // FCF & Growth (20 points)
  if (fund.epsGrowth3y && fund.epsGrowth3y > 0.15) {
    score += 10;
    rationale.push(`EPS büyümesi %${(fund.epsGrowth3y * 100).toFixed(0)} (Güçlü)`);
  }

  if (fund.fcf && fund.fcf > 0) {
    score += 5;
    rationale.push(`FCF pozitif ve sağlıklı`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    rationale,
  };
}

// ============================================================================
// AGENT 2: MACRO & SECTOR (WITH v3.0 ENHANCEMENTS)
// ============================================================================

function analyzeMakro(
  macro: V3DecisionRequest['macro'],
  beta: number = 1.0,
  rs: number = 1.0
): {
  score: number;
  rationale: string[];
  beta: number;
  rs: number;
} {
  if (!macro) return { score: 50, rationale: [], beta, rs };

  const rationale: string[] = [];
  let score = 50;

  // Makroekonomik Ortam (40 points)
  if (macro.fedStance === 'RELAXING') {
    score += 10;
    rationale.push('Fed gevşetme döneminde');
  } else if (macro.fedStance === 'TIGHT') {
    score -= 10;
    rationale.push('Fed sıkılaştırma ortamı');
  }

  if (macro.inflationStatus === 'CONTROLLED') {
    score += 8;
    rationale.push('Enflasyon kontrol altında');
  }

  if (macro.gdpGrowth && macro.gdpGrowth > 0.03) {
    score += 8;
    rationale.push(`GDP büyümesi ${(macro.gdpGrowth * 100).toFixed(1)}%`);
  }

  if (macro.yieldCurve === 'POSITIVE') {
    score += 8;
  }

  // Sektörel Dinamikler (40 points)
  if (macro.sectorTailwind === 'STRONG') {
    score += 12;
    rationale.push('Sektörel tailwind güçlü');
  } else if (macro.sectorTailwind === 'HEADWIND') {
    score -= 12;
    rationale.push('Sektörel headwind');
  }

  if (macro.sentiment === 'BULLISH') {
    score += 8;
    rationale.push('Market sentiment pozitif');
  } else if (macro.sentiment === 'BEARISH') {
    score -= 8;
  }

  // v3.0: Beta & RS Analysis (10 points)
  if (beta > 1.3) {
    score -= 3;
    rationale.push(`Beta yüksek (${beta}) - volatilite riski`);
  } else if (beta < 0.7) {
    score += 2;
    rationale.push(`Beta düşük (${beta}) - defensive`);
  }

  if (rs > 1.2) {
    score += 3;
    rationale.push(`RS sektörü yeniyor (${rs.toFixed(2)})`);
  } else if (rs < 0.8) {
    score -= 3;
    rationale.push(`RS sektörde geri (${rs.toFixed(2)})`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    rationale,
    beta,
    rs,
  };
}

// ============================================================================
// AGENT 3: TECHNICAL (WITH v3.0 REGIME SWITCHING)
// ============================================================================

function analyzeTeknik(
  ohlc: V3DecisionRequest['technicals']['ohlc'],
  rsi?: number,
  adx?: number,
  chop?: number
): {
  score: number;
  rationale: string[];
  adx: number;
  chop: number;
  trendType: string;
} {
  if (!ohlc || ohlc.length === 0) {
    return {
      score: 50,
      rationale: [],
      adx: 25,
      chop: 50,
      trendType: 'NEUTRAL',
    };
  }

  const closes = ohlc.map((x) => x.close);
  const rationale: string[] = [];
  let score = 50;

  // Calculate if not provided
  const calcRSI = rsi || calculateRSI(closes);
  const calcADX = adx || calculateADX(ohlc);
  const calcCHOP = chop || calculateCHOP(ohlc);

  // Regime detection
  const regime = detectRegime(calcADX, calcCHOP);

  // Trend Analysis (40 points)
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateEMA(closes, 50);
  const currentPrice = closes[closes.length - 1];

  let trendType = 'NEUTRAL';
  if (currentPrice > sma20 && sma20 > sma50) {
    score += 15;
    trendType = 'BULLISH';
    rationale.push('Golden Cross sinyali aktif');
  } else if (currentPrice < sma20 && sma20 < sma50) {
    score -= 15;
    trendType = 'BEARISH';
    rationale.push('Death Cross sinyali');
  }

  // Momentum (35 points)
  if (calcRSI < 40 && calcRSI > 30) {
    score += 12;
    rationale.push(`RSI ${calcRSI.toFixed(0)} - erken AL`);
  } else if (calcRSI > 70) {
    score -= 5;
    rationale.push(`RSI ${calcRSI.toFixed(0)} - aşırı alım`);
  } else if (calcRSI < 30) {
    score += 10;
    rationale.push(`RSI ${calcRSI.toFixed(0)} - aşırı satış`);
  }

  const macd = calculateMACD(closes);
  if (macd.histogram > 0) {
    score += 8;
    rationale.push('MACD pozitif momentum');
  }

  // v3.0: Regime Switching Adjustment
  let regimeBonus = 0;
  if (regime.regime === 'TREND' && calcADX > 25) {
    regimeBonus = Math.min(15, (calcADX - 25) * 0.5);
    rationale.push(`ADX ${calcADX.toFixed(0)} - güçlü trend`);
  } else if (regime.regime === 'RANGE' && calcCHOP > 61.8) {
    regimeBonus = -10;
    rationale.push('Range market - MA sinyalleri düşük başarılı');
  }

  score += regimeBonus;

  return {
    score: Math.max(0, Math.min(100, score)),
    rationale,
    adx: Math.round(calcADX * 100) / 100,
    chop: Math.round(calcCHOP * 100) / 100,
    trendType,
  };
}

// ============================================================================
// AGENT 6: DECISION-MAKER META AGENT — narrative synthesis
// ============================================================================
// Builds a 2-3 sentence Turkish summary blending all agent outputs so the
// user gets a plain-language "why this decision" at a glance.

function buildNarrative(args: {
  decision: string;
  symbol: string;
  fundamentalScore: number;
  macroScore: number;
  technicalScore: number;
  qualitativeScore: number | null;
  qualitativeAdjustment: number;
  weightedScore: number;
  timeHorizon: string;
  analystLabel?: string;
  insiderBuying?: string;
  corporateSummary?: string;
  keyRisks?: string[];
  stressRec: string;
}): string {
  const parts: string[] = [];

  // Opening: what the quant side says
  const quantTone =
    args.fundamentalScore >= 65 && args.macroScore >= 55
      ? 'finansal tablo güçlü ve makro ortam destekleyici'
      : args.fundamentalScore >= 60
      ? 'finansal tablo makul'
      : args.fundamentalScore < 45
      ? 'finansal tablo zayıf'
      : 'finansal tablo karışık';

  const techTone =
    args.technicalScore >= 65
      ? 'teknik momentum pozitif'
      : args.technicalScore <= 40
      ? 'teknik momentum negatif'
      : 'teknik tablo nötr';

  parts.push(
    `${args.symbol} için ${quantTone}; ${techTone} (T:${Math.round(args.fundamentalScore)} · M:${Math.round(args.macroScore)} · Tk:${Math.round(args.technicalScore)}).`
  );

  // Qualitative layer contribution
  if (args.qualitativeScore !== null) {
    const qualSign = args.qualitativeAdjustment > 0.5 ? '+' : args.qualitativeAdjustment < -0.5 ? '' : '±';
    const qualPhrase =
      args.qualitativeScore >= 65
        ? 'kurumsal istihbarat katmanı pozitif (analist desteği/pozitif haber akışı)'
        : args.qualitativeScore <= 40
        ? 'kurumsal istihbarat katmanı uyarı veriyor'
        : 'kurumsal istihbarat katmanı nötr';

    parts.push(
      `${qualPhrase}, final skora ${qualSign}${args.qualitativeAdjustment.toFixed(1)} puan katkı (analist: ${args.analystLabel || '—'}, içeriden alım: ${args.insiderBuying || '—'}).`
    );
  }

  // Decision summary
  const horizonLabel =
    args.timeHorizon === 'LONG_TERM' ? 'uzun vadeli bir bakışta' :
    args.timeHorizon === 'SHORT_TERM' ? 'kısa vadeli bakışta' :
    'orta vadeli bakışta';

  const actionPhrase: Record<string, string> = {
    AL: `${horizonLabel} pozisyon açmak için sinyal koşulları sağlanıyor`,
    SAT: `${horizonLabel} çıkış/kısa pozisyon için gerekçeler ağır basıyor`,
    TUT: `${horizonLabel} mevcut pozisyonu korumak uygun, yeni giriş için tetik eksik`,
    'İZLE': `${horizonLabel} tablo kararsız, gelişmeleri beklemek doğru`,
  };

  parts.push(
    `Sonuç: ${actionPhrase[args.decision] || 'karar belirsiz'} (ağırlıklı skor ${args.weightedScore.toFixed(1)}/100${args.stressRec === 'FAIL' ? ', stress test uyarısı' : ''}).`
  );

  // Append 1 corporate risk if present
  if (args.keyRisks && args.keyRisks.length > 0) {
    parts.push(`Dikkat: ${args.keyRisks[0]}.`);
  }

  // If corporate summary exists and narrative is short, append it
  if (args.corporateSummary && parts.join(' ').length < 300) {
    parts.push(args.corporateSummary);
  }

  return parts.join(' ');
}

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as V3DecisionRequest;
    const { symbol, currentPrice, fundamentals, technicals, macro, dataAge, portfolio, corporate, locale = 'tr' } =
      body;

    if (!symbol || !currentPrice) {
      return NextResponse.json(
        { error: 'Symbol and price required' },
        { status: 400 }
      );
    }

    // ========================================
    // AGENT 0: DATA QUALITY GATEKEEPER
    // ========================================

    const dataQuality = calculateDataQuality({
      priceAge: dataAge?.priceMinutesOld || 5,
      sectorDataAge: dataAge?.sectorHoursOld || 24,
      technicalDataAge: dataAge?.technicalHoursOld || 1,
      hasOutliers: false,
      missingData: !fundamentals || !technicals || !macro,
    });

    if (!dataQuality.isValid) {
      return NextResponse.json(
        {
          error: 'Data quality too low',
          dataQuality,
        },
        { status: 422 }
      );
    }

    // ========================================
    // AGENT 1: FUNDAMENTAL ANALYSIS
    // ========================================

    const fundamental = analyzeNazary(fundamentals);

    // ========================================
    // AGENT 2: MACRO & SECTOR
    // ========================================

    const macroAnalysis = analyzeMakro(
      macro,
      macro?.beta || 1.0,
      macro?.rsScore || 1.0
    );

    // ========================================
    // AGENT 3: TECHNICAL (with v3.0)
    // ========================================

    const technical = analyzeTeknik(
      technicals?.ohlc || [],
      technicals?.rsi,
      undefined, // Will calculate ADX
      undefined  // Will calculate CHOP
    );

    // ========================================
    // REGIME & TIME HORIZON DETERMINATION
    // ========================================

    let timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

    if (fundamental.score > 70 && macroAnalysis.score > 60) {
      timeHorizon = 'LONG_TERM';
    } else if (fundamental.score < 45 && technical.score > 65) {
      timeHorizon = 'SHORT_TERM';
    } else {
      timeHorizon = 'MEDIUM_TERM';
    }

    // Dynamic Weighting based on time horizon
    let wF: number, wM: number, wT: number;

    if (timeHorizon === 'LONG_TERM') {
      wF = 0.5;
      wM = 0.3;
      wT = 0.2;
    } else if (timeHorizon === 'SHORT_TERM') {
      wF = 0.1;
      wM = 0.2;
      wT = 0.7;
    } else {
      wF = 0.35;
      wM = 0.35;
      wT = 0.3;
    }

    // Regime adjustment
    if (technical.adx > 25) {
      wT += 0.1;
      wF -= 0.05;
      wM -= 0.05;
    } else if (technical.adx < 20) {
      wF += 0.05;
      wM += 0.05;
      wT -= 0.1;
    }

    // Normalize
    const sum = wF + wM + wT;
    wF /= sum;
    wM /= sum;
    wT /= sum;

    // ========================================
    // AGENT 4: WEIGHTED DECISION (quantitative base)
    // ========================================

    const quantScore = fundamental.score * wF + macroAnalysis.score * wM + technical.score * wT;

    // ========================================
    // AGENT 5: QUALITATIVE ADJUSTMENT (corporate intel)
    // ========================================
    // Qualitative weight caps adjustment at ±10 points, only applied if we
    // have an actual score from the corporate agent (not just 50 fallback).
    const hasQualitative = corporate?.qualitativeScore !== undefined;
    const qualitativeScore = hasQualitative ? corporate!.qualitativeScore! : 50;
    const qualitativeWeight = hasQualitative ? 0.15 : 0;

    // Center around 50 → ±50 range → ±10 points at w=0.15, ±7.5 at w=0.10
    const qualitativeAdjustment = hasQualitative
      ? Math.round(((qualitativeScore - 50) / 50) * 10 * (qualitativeWeight / 0.15) * 10) / 10
      : 0;

    const weightedScore = Math.max(0, Math.min(100, quantScore + qualitativeAdjustment));

    // Decision logic
    let decision: 'AL' | 'SAT' | 'TUT' | 'İZLE';

    if (weightedScore > 65) {
      decision = 'AL';
    } else if (weightedScore > 55) {
      decision = 'TUT';
    } else if (weightedScore < 40) {
      decision = 'SAT';
    } else {
      decision = 'İZLE';
    }

    // ========================================
    // PRICE TARGETS & RISK MANAGEMENT
    // ========================================

    // Convert to OHLCV format for ATR calculation
    const ohlcv = (technicals?.ohlc || []).map(x => ({
      timestamp: x.timestamp,
      open: x.open,
      high: x.high,
      low: x.low,
      close: x.close,
      volume: x.volume || 0
    }));

    const atr = calculateATR(ohlcv);
    const volatilityAdj = calculateVolatilityAdjustment(atr, currentPrice);

    // Target price (20-30% above for AL, below for SAT)
    const targetPrice = weightedScore > 60
      ? currentPrice * (1 + (weightedScore / 100) * 0.3)
      : currentPrice * (1 - ((100 - weightedScore) / 100) * 0.2);

    // Stop loss (5-15% below entry)
    const stopLoss = currentPrice * (1 - Math.max(0.05, Math.min(0.15, 1 - weightedScore / 100)));

    const riskRewardRatio = (targetPrice - currentPrice) / (currentPrice - stopLoss);

    // Entry zone
    const entryZone = calculateEntryZone({
      currentPrice,
      technicalScore: technical.score,
      regimeName: technical.trendType,
    });

    // ========================================
    // SUPPORT & RESISTANCE
    // ========================================

    const sr = calculateSupportResistance(technicals?.ohlc || []);

    // ========================================
    // STRESS TEST & ANTI-BIAS
    // ========================================

    const stressTest = runStressTest({
      currentPrice,
      stopLoss,
      targetPrice,
      entryPrice: currentPrice,
      fundamentalScore: fundamental.score,
      macroScore: macroAnalysis.score,
    });

    const riskAssessment = generateRiskAssessment({
      fundamentalScore: fundamental.score,
      macroScore: macroAnalysis.score,
      technicalScore: technical.score,
      symbol,
      currentPrice,
      targetPrice,
      stopLoss,
    });

    // ========================================
    // POSITION SIZING
    // ========================================

    const positionSize = calculatePositionSize({
      score: weightedScore,
      atr,
      currentPrice,
      portfolioValue: portfolio?.totalValue || 100000,
      riskTolerance: portfolio?.riskTolerance || 0.02,
      maxPosition: portfolio?.maxPosition || 4,
      volatilityAdjustment: volatilityAdj,
    });

    // Apply stress test adjustment
    positionSize.finalPosition *= stressTest.positionSizeAdjustment;

    // ========================================
    // CONFIDENCE & CAVEAT
    // ========================================

    const confidence = calculateConfidenceLevel({
      fundamentalScore: fundamental.score,
      macroScore: macroAnalysis.score,
      technicalScore: technical.score,
      dataQualityScore: dataQuality.score,
      regimeMatch: technical.trendType !== 'NEUTRAL',
    });

    let caveat = '';
    if (macroAnalysis.score < 50) caveat += 'Makro ortam riskli. ';
    if (technical.adx > 40) caveat += 'Aşırı trend, pullback bekleme. ';
    if (stressTest.recommendation === 'FAIL') caveat += 'Stress test uyarısı: Position boyutu azaltma. ';
    if (!caveat) caveat = 'Düşük risk ortamında analiz yapılmıştır.';

    // ========================================
    // RESPONSE
    // ========================================

    const response: V3DecisionResponse = {
      symbol,
      decision,
      weightedScore: Math.round(weightedScore * 10) / 10,

      fundamentalScore: Math.round(fundamental.score),
      macroScore: Math.round(macroAnalysis.score),
      technicalScore: Math.round(technical.score),
      dataQualityScore: dataQuality.score,

      fundamentalRationale: fundamental.rationale,
      macroRationale: macroAnalysis.rationale,
      technicalRationale: technical.rationale,

      weights: {
        fundamental: Math.round(wF * 100) / 100,
        macro: Math.round(wM * 100) / 100,
        technical: Math.round(wT * 100) / 100,
        qualitative: qualitativeWeight,
      },

      qualitativeScore: hasQualitative ? qualitativeScore : undefined,
      qualitativeAdjustment: hasQualitative ? qualitativeAdjustment : undefined,

      decisionNarrative: buildNarrative({
        decision,
        symbol,
        fundamentalScore: fundamental.score,
        macroScore: macroAnalysis.score,
        technicalScore: technical.score,
        qualitativeScore: hasQualitative ? qualitativeScore : null,
        qualitativeAdjustment: hasQualitative ? qualitativeAdjustment : 0,
        weightedScore,
        timeHorizon,
        analystLabel: corporate?.analystLabel,
        insiderBuying: corporate?.insiderBuying,
        corporateSummary: corporate?.narrativeSummary,
        keyRisks: corporate?.keyRisks,
        stressRec: stressTest.recommendation,
      }),

      inputs: {
        pe: fundamentals?.pe,
        sectorPE: fundamentals?.sectorPE,
        roe: fundamentals?.roe,
        sectorROE: fundamentals?.sectorROE,
        debtToEquity: fundamentals?.debtToEquity,
        epsGrowth3y: fundamentals?.epsGrowth3y,
        fcf: fundamentals?.fcf,
        beta: macroAnalysis.beta,
        rs: macroAnalysis.rs,
        fedStance: macro?.fedStance,
        inflationStatus: macro?.inflationStatus,
        sectorTailwind: macro?.sectorTailwind,
        sentiment: macro?.sentiment,
      },

      dataSources: {
        price: 'Finnhub / Binance (/api/quote)',
        fundamentals: 'Finnhub (/api/stock/fundamentals)',
        technicals: `Yahoo/Finnhub OHLC — ${technicals?.ohlc?.length || 0} mum`,
        macro: 'Manuel konfigürasyon (FRED entegrasyonu yolda)',
      },

      regime: technical.trendType === 'BULLISH' ? 'TREND' : technical.trendType === 'BEARISH' ? 'TREND' : 'RANGE',
      regimeStrength: stressTest.recommendation === 'PASS' ? 'STRONG' : 'MODERATE',
      timeHorizon,
      adx: technical.adx,
      chop: technical.chop,

      entryZone: {
        lower: Math.round(entryZone.lowerBound * 100) / 100,
        upper: Math.round(entryZone.upperBound * 100) / 100,
      },
      targetPrice: Math.round(targetPrice * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      trailingStopEnabled: true,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,

      positionSize: {
        kellyCriterion: positionSize.kellyCriterion,
        volatilityAdjustment: positionSize.volatilityAdjustment,
        varLimit: positionSize.varLimit,
        finalPosition: Math.max(0.25, positionSize.finalPosition),
        maxDailyLoss: Math.round(positionSize.maxDailyLoss * 100) / 100,
      },

      bullCase: riskAssessment.bullCase,
      bearCase: riskAssessment.bearCase,
      worstCase: riskAssessment.worstCase,

      stressTest: {
        passCount: stressTest.passCount,
        failCount: stressTest.failCount,
        recommendation: stressTest.recommendation,
        positionAdjustment: stressTest.positionSizeAdjustment,
      },

      support: sr.support.map((x) => Math.round(x * 100) / 100),
      resistance: sr.resistance.map((x) => Math.round(x * 100) / 100),

      confidenceLevel: confidence,
      caveat,
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v3/decision]', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
