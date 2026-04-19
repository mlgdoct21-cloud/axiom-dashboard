/**
 * AXIOM v3.0 Advanced Indicators
 * ADX, CHOP, Beta, Relative Strength, Regime Detection
 */

export interface OHLC {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ============================================================================
// ADX-14 (Average Directional Index)
// ============================================================================

/**
 * Calculates ADX-14 for trend strength detection
 * ADX > 25 = Strong Trend
 * ADX 20-25 = Transition
 * ADX < 20 = Range Market
 */
export function calculateADX(ohlcData: OHLC[], period: number = 14): number {
  if (ohlcData.length < period + 1) {
    return 25; // Default to neutral
  }

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trueRange: number[] = [];

  // Calculate DM and TR for each bar
  for (let i = 1; i < ohlcData.length; i++) {
    const curr = ohlcData[i];
    const prev = ohlcData[i - 1];

    // Directional Movements
    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    let pDM = 0;
    let mDM = 0;

    if (upMove > downMove && upMove > 0) {
      pDM = upMove;
    }
    if (downMove > upMove && downMove > 0) {
      mDM = downMove;
    }

    plusDM.push(pDM);
    minusDM.push(mDM);

    // True Range
    const tr1 = curr.high - curr.low;
    const tr2 = Math.abs(curr.high - prev.close);
    const tr3 = Math.abs(curr.low - prev.close);
    trueRange.push(Math.max(tr1, tr2, tr3));
  }

  // Calculate smoothed values (14-period)
  let sumPlusDM = 0,
    sumMinusDM = 0,
    sumTR = 0;

  for (let i = 0; i < period; i++) {
    sumPlusDM += plusDM[i];
    sumMinusDM += minusDM[i];
    sumTR += trueRange[i];
  }

  let smoothPlusDM = sumPlusDM;
  let smoothMinusDM = sumMinusDM;
  let smoothTR = sumTR;

  // Continue smoothing
  for (let i = period; i < plusDM.length; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    smoothTR = smoothTR - smoothTR / period + trueRange[i];
  }

  // Calculate DI values
  const plusDI =
    smoothTR !== 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
  const minusDI =
    smoothTR !== 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

  // Calculate DX
  const diSum = plusDI + minusDI;
  const dx = diSum !== 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;

  // Calculate ADX (smooth the DX)
  let adx = 0;
  for (let i = 0; i < period && i < plusDM.length; i++) {
    adx += dx;
  }
  adx = adx / period;

  return Math.round(adx * 100) / 100;
}

// ============================================================================
// CHOP Index (Choppiness Index)
// ============================================================================

/**
 * CHOP Index detects ranging vs trending markets
 * CHOP > 61.8 = Choppy/Range
 * CHOP 38.2-61.8 = Uncertain
 * CHOP < 38.2 = Trending
 */
export function calculateCHOP(ohlcData: OHLC[], period: number = 14): number {
  if (ohlcData.length < period) {
    return 50; // Default to neutral
  }

  const recentData = ohlcData.slice(-period);
  const closes = recentData.map((x) => x.close);
  const highs = recentData.map((x) => x.high);
  const lows = recentData.map((x) => x.low);

  // Calculate log sum of true ranges
  let sumATR = 0;
  for (let i = 1; i < recentData.length; i++) {
    const curr = recentData[i];
    const prev = recentData[i - 1];
    const tr1 = curr.high - curr.low;
    const tr2 = Math.abs(curr.high - prev.close);
    const tr3 = Math.abs(curr.low - prev.close);
    const tr = Math.max(tr1, tr2, tr3);
    sumATR += tr;
  }

  const highestHigh = Math.max(...highs);
  const lowestLow = Math.min(...lows);
  const range = highestHigh - lowestLow;

  // CHOP = 100 * LOG10(SUM(ATR, n) / (MAX(HIGH, n) - MIN(LOW, n))) / LOG10(n)
  const chop =
    range > 0
      ? (100 *
          Math.log10(sumATR / range)) /
        Math.log10(period)
      : 50;

  return Math.round(chop * 100) / 100;
}

// ============================================================================
// Beta Calculation
// ============================================================================

/**
 * Calculates Beta (volatility vs market)
 * Beta > 1.3 = High volatility
 * Beta 0.7-1.3 = Normal
 * Beta < 0.7 = Low volatility (defensive)
 */
export function calculateBeta(
  stockReturns: number[],
  marketReturns: number[],
  period: number = 252
): number {
  if (
    stockReturns.length < period ||
    marketReturns.length < period
  ) {
    return 1.0; // Default to market beta
  }

  const recentStock = stockReturns.slice(-period);
  const recentMarket = marketReturns.slice(-period);

  // Calculate covariance
  const avgStock =
    recentStock.reduce((a, b) => a + b) / period;
  const avgMarket =
    recentMarket.reduce((a, b) => a + b) / period;

  let covariance = 0;
  for (let i = 0; i < period; i++) {
    covariance += (recentStock[i] - avgStock) * (recentMarket[i] - avgMarket);
  }
  covariance /= period;

  // Calculate market variance
  let variance = 0;
  for (let i = 0; i < period; i++) {
    variance += (recentMarket[i] - avgMarket) ** 2;
  }
  variance /= period;

  const beta = variance > 0 ? covariance / variance : 1.0;

  return Math.round(beta * 100) / 100;
}

// ============================================================================
// Relative Strength (RS) Score
// ============================================================================

/**
 * RS Score: Stock performance vs Sector
 * RS > 1.2 = Outperforming
 * RS 0.8-1.2 = In line
 * RS < 0.8 = Underperforming
 */
export function calculateRSScore(
  stockPrice: number,
  stockPricePrev: number,
  sectorPrice: number,
  sectorPricePrev: number
): number {
  const stockReturn = (stockPrice - stockPricePrev) / stockPricePrev;
  const sectorReturn = (sectorPrice - sectorPricePrev) / sectorPricePrev;

  const rs =
    sectorReturn !== 0
      ? (1 + stockReturn) / (1 + sectorReturn)
      : 1.0;

  return Math.round(rs * 100) / 100;
}

// ============================================================================
// Regime Detection (TREND vs RANGE vs TRANSITION)
// ============================================================================

export type RegimeType = "TREND" | "RANGE" | "TRANSITION";

export interface RegimeDetectionResult {
  regime: RegimeType;
  adx: number;
  chop: number;
  strength: "STRONG" | "MODERATE" | "WEAK";
}

export function detectRegime(
  adx: number,
  chop: number
): RegimeDetectionResult {
  let regime: RegimeType;
  let strength: "STRONG" | "MODERATE" | "WEAK";

  if (adx > 25) {
    regime = "TREND";
    strength = adx > 40 ? "STRONG" : "MODERATE";
  } else if (adx < 20) {
    regime = "RANGE";
    strength = chop > 61.8 ? "STRONG" : "MODERATE";
  } else {
    regime = "TRANSITION";
    strength = "WEAK";
  }

  return { regime, adx, chop, strength };
}

// ============================================================================
// Data Quality Scoring
// ============================================================================

export interface DataQualityScore {
  score: number; // 0-100
  issues: string[];
  isValid: boolean; // score >= 70
}

export function calculateDataQuality(params: {
  priceAge: number; // minutes
  sectorDataAge: number; // hours
  technicalDataAge: number; // hours
  hasOutliers: boolean;
  missingData: boolean;
}): DataQualityScore {
  const issues: string[] = [];
  let score = 100;

  // Price data freshness (< 5 min = 100%)
  if (params.priceAge > 5) {
    score -= Math.min(20, (params.priceAge - 5) * 2);
    issues.push(`Fiyat verisi ${params.priceAge} dakika eski`);
  }

  // Sector data (< 24 hours = 100%)
  if (params.sectorDataAge > 24) {
    score -= 10;
    issues.push(`Sektör verisi ${params.sectorDataAge} saat eski`);
  }

  // Technical indicators (< 1 hour = 100%)
  if (params.technicalDataAge > 1) {
    score -= Math.min(15, params.technicalDataAge * 5);
    issues.push(`Teknik verisi ${params.technicalDataAge} saat eski`);
  }

  // Outliers detection
  if (params.hasOutliers) {
    score -= 15;
    issues.push("Aykırı değerler tespit edildi");
  }

  // Missing data
  if (params.missingData) {
    score -= 20;
    issues.push("Eksik veriler bulundu");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    issues,
    isValid: score >= 70,
  };
}

// ============================================================================
// Support & Resistance Levels
// ============================================================================

export interface SupportResistance {
  support: number[];
  resistance: number[];
  pivot: number;
}

export function calculateSupportResistance(
  ohlcData: OHLC[]
): SupportResistance {
  if (ohlcData.length === 0) {
    return {
      support: [],
      resistance: [],
      pivot: 0,
    };
  }

  const recentData = ohlcData.slice(-30); // 30-period support/resistance
  const highs = recentData.map((x) => x.high);
  const lows = recentData.map((x) => x.low);
  const closes = recentData.map((x) => x.close);

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const currentClose = closes[closes.length - 1];

  // Pivot points (daily)
  const pivot = (maxHigh + minLow + currentClose) / 3;
  const r1 = pivot * 2 - minLow;
  const r2 = pivot + (maxHigh - minLow);
  const s1 = pivot * 2 - maxHigh;
  const s2 = pivot - (maxHigh - minLow);

  // Find actual support/resistance from recent data
  const support = [s2, s1, Math.min(...lows)].filter(
    (x) => x < currentClose
  );
  const resistance = [r1, r2, Math.max(...highs)].filter(
    (x) => x > currentClose
  );

  return {
    support: support.sort((a, b) => b - a),
    resistance: resistance.sort((a, b) => a - b),
    pivot,
  };
}

// ============================================================================
// Trend Line Detection (Simple)
// ============================================================================

export function detectTrend(
  ohlcData: OHLC[]
): "BULLISH" | "BEARISH" | "NEUTRAL" {
  if (ohlcData.length < 20) return "NEUTRAL";

  const closes = ohlcData.map((x) => x.close);
  const recentCloses = closes.slice(-20);

  // Simple trend: compare SMA20 vs current price
  const sma20 =
    recentCloses.reduce((a, b) => a + b) / 20;
  const currentPrice = closes[closes.length - 1];

  const ma50Index = Math.max(0, closes.length - 50);
  const ma50Closes = closes.slice(ma50Index);
  const sma50 = ma50Closes.reduce((a, b) => a + b) / ma50Closes.length;

  // Bullish: price > SMA20 > SMA50
  if (
    currentPrice > sma20 &&
    sma20 > sma50
  ) {
    return "BULLISH";
  }

  // Bearish: price < SMA20 < SMA50
  if (
    currentPrice < sma20 &&
    sma20 < sma50
  ) {
    return "BEARISH";
  }

  return "NEUTRAL";
}

// ============================================================================
// Volatility Adjustment for Position Sizing
// ============================================================================

export function calculateVolatilityAdjustment(
  atr: number,
  currentPrice: number
): number {
  if (currentPrice === 0) return 1.0;

  // ATR% = (ATR / Price) * 100
  const atrPercent = (atr / currentPrice) * 100;

  // Volatility multiplier (lower volatility = larger position)
  // 1% ATR% = 1.0x (normal)
  // 2% ATR% = 0.5x (reduce position)
  // 0.5% ATR% = 1.5x (increase position)
  const multiplier = 1 / Math.max(0.5, atrPercent);

  return Math.round(multiplier * 100) / 100;
}

export default {
  calculateADX,
  calculateCHOP,
  calculateBeta,
  calculateRSScore,
  detectRegime,
  calculateDataQuality,
  calculateSupportResistance,
  detectTrend,
  calculateVolatilityAdjustment,
};
