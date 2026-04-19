/**
 * AXIOM v3.0 Decision Engine
 * Kelly Criterion, Stress Test, Position Sizing, Risk Management
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StressTestScenario {
  name: string; // "Faiz Şoku", "Sektörel Headwind", vb
  trigger: string; // Açıklama
  priceImpact: number; // -0.25 for -25%
  probability: number; // 0-1
  stopsAtLoss: boolean; // Stop loss kırılır mı?
}

export interface StressTestResult {
  scenarios: StressTestScenario[];
  passCount: number; // Kaç senaryoda stop loss korunuyor
  failCount: number; // Kaç senaryoda kırılıyor
  recommendation: "PASS" | "CAUTION" | "FAIL"; // Position boyutu adjust
  positionSizeAdjustment: number; // 1.0 = no change, 0.75 = 25% reduce
}

export interface PositionSizing {
  kellyCriterion: number; // % of portfolio
  volatilityAdjustment: number; // multiplier
  varLimit: number; // max % of portfolio
  finalPosition: number; // % of portfolio
  maxDailyLoss: number; // $ amount
}

export interface RiskAssessment {
  bullCase: string[]; // 3-4 razlogs for BUY
  bearCase: {
    scenario: string;
    trigger: string;
    impact: string;
    probability: number; // 0-1
  }[];
  worstCase: {
    description: string;
    potentialLoss: number; // % loss
    protected: boolean; // stop-loss guards?
  };
}

// ============================================================================
// KELLY CRITERION - Position Sizing
// ============================================================================

/**
 * Kelly Criterion: f* = (b*p - q) / b
 * f* = fraction of capital to risk
 * b = odds (reward/risk ratio)
 * p = win probability
 * q = loss probability (1-p)
 *
 * Conservative: Use f / 2.5 (quarter kelly)
 */
export function calculateKellyCriterion(params: {
  winProbability: number; // 0-1 (confidence)
  rewardRiskRatio: number; // target/stop ratio
  riskTolerance: number; // 0-1, default 0.02 (2% per trade)
  maxPosition: number; // % portfolio (default 4%)
}): number {
  const { winProbability, rewardRiskRatio, riskTolerance, maxPosition } = params;

  // Handle edge cases
  if (rewardRiskRatio <= 0 || winProbability <= 0) {
    return 0;
  }

  const p = winProbability;
  const q = 1 - p;
  const b = rewardRiskRatio;

  // f = (p*b - q) / b
  let f = (p * b - q) / b;

  // Conservative: use quarter kelly
  f = f / 2.5;

  // Apply risk tolerance
  const position = f * riskTolerance * 100;

  // Cap at max position
  return Math.min(position, maxPosition);
}

// ============================================================================
// VAR (Value at Risk) - Daily Loss Limit
// ============================================================================

export function calculateVAR(params: {
  portfolioValue: number;
  confidenceLevel: number; // 0.95 = 95% confident loss < X
  dailyVolatility: number; // std dev of returns
  maxDailyLossPercent: number; // default 0.5%
}): number {
  const { portfolioValue, confidenceLevel, dailyVolatility, maxDailyLossPercent } =
    params;

  // Z-score for confidence level
  const zScore = Math.abs(2.33); // 99% confidence

  // VAR = Portfolio * Z-score * Daily Volatility
  const var_ = portfolioValue * zScore * dailyVolatility;

  // Hard cap at maxDailyLossPercent
  const maxLoss = (portfolioValue * maxDailyLossPercent) / 100;

  return Math.min(var_, maxLoss);
}

// ============================================================================
// POSITION SIZE CALCULATOR
// ============================================================================

export function calculatePositionSize(params: {
  score: number; // weighted 0-100
  atr: number; // average true range
  currentPrice: number;
  portfolioValue: number;
  riskTolerance: number; // 0.02 = 2% risk per trade
  maxPosition: number; // % portfolio (default 4%)
  volatilityAdjustment: number; // from v3-indicators
}): PositionSize {
  // Kelly Criterion (base)
  const kelly = calculateKellyCriterion({
    winProbability: params.score / 100,
    rewardRiskRatio: Math.max(1.5, (100 - params.score) / 50), // Adjust ratio based on score
    riskTolerance: params.riskTolerance,
    maxPosition: params.maxPosition,
  });

  // Volatility adjustment
  const afterVolatility = kelly * params.volatilityAdjustment;

  // VAR limit check
  const var_ = calculateVAR({
    portfolioValue: params.portfolioValue,
    confidenceLevel: 0.95,
    dailyVolatility: (params.atr / params.currentPrice) * 0.1, // approximate
    maxDailyLossPercent: 0.5,
  });

  const varAsPercent = (var_ / params.portfolioValue) * 100;
  const finalPosition = Math.min(afterVolatility, varAsPercent);

  return {
    kellyCriterion: Math.round(kelly * 100) / 100,
    volatilityAdjustment: Math.round(params.volatilityAdjustment * 100) / 100,
    varLimit: Math.round(varAsPercent * 100) / 100,
    finalPosition: Math.max(0.25, Math.round(finalPosition * 100) / 100), // Min 0.25%
    maxDailyLoss: (params.portfolioValue * finalPosition) / 100,
  };
}

export interface PositionSize {
  kellyCriterion: number;
  volatilityAdjustment: number;
  varLimit: number;
  finalPosition: number;
  maxDailyLoss: number;
}

// ============================================================================
// TRAILING STOP LOGIC
// ============================================================================

export interface TrailingStopResult {
  entry: number;
  initialStop: number;
  currentPrice: number;
  trailingStop: number;
  profit: number; // $
  profitPercent: number; // %
  status: "ENTRY" | "TRAILING" | "TP_HIT" | "SL_HIT";
  action: "HOLD" | "CLOSE_PROFIT" | "CLOSE_LOSS";
}

export function calculateTrailingStop(params: {
  entry: number;
  currentPrice: number;
  stopLoss: number;
  targetPrice: number;
  trailAmount: number; // $ amount to trail (or % if negative)
}): TrailingStopResult {
  const { entry, currentPrice, stopLoss, targetPrice, trailAmount } = params;

  const profit = currentPrice - entry;
  const profitPercent = (profit / entry) * 100;

  let status: "ENTRY" | "TRAILING" | "TP_HIT" | "SL_HIT";
  let action: "HOLD" | "CLOSE_PROFIT" | "CLOSE_LOSS";
  let trailingStop = stopLoss;

  // TP hit?
  if (currentPrice >= targetPrice) {
    status = "TP_HIT";
    action = "CLOSE_PROFIT";
    trailingStop = targetPrice;
  }
  // SL hit?
  else if (currentPrice <= stopLoss) {
    status = "SL_HIT";
    action = "CLOSE_LOSS";
    trailingStop = stopLoss;
  }
  // Trailing active?
  else if (profit > 0) {
    status = "TRAILING";
    action = "HOLD";
    // Trail stop by X amount from peak
    const peak = Math.max(entry, currentPrice);
    const trail = trailAmount > 0 ? trailAmount : (peak * Math.abs(trailAmount)) / 100;
    trailingStop = Math.max(stopLoss, peak - trail);
  } else {
    status = "ENTRY";
    action = "HOLD";
  }

  return {
    entry,
    initialStop: stopLoss,
    currentPrice,
    trailingStop: Math.round(trailingStop * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    profitPercent: Math.round(profitPercent * 100) / 100,
    status,
    action,
  };
}

// ============================================================================
// STRESS TEST ENGINE
// ============================================================================

export function runStressTest(params: {
  currentPrice: number;
  stopLoss: number;
  targetPrice: number;
  entryPrice: number;
  fundamentalScore: number;
  macroScore: number;
}): StressTestResult {
  const { currentPrice, stopLoss, targetPrice, entryPrice, fundamentalScore, macroScore } =
    params;

  const scenarios: StressTestScenario[] = [
    {
      name: "Faiz Şoku",
      trigger: "Faiz %1 artarsa (Discount rate ↑)",
      priceImpact: -0.25, // -25% scenario
      probability: 0.15,
      stopsAtLoss: checkStopLoss(currentPrice * 0.75, stopLoss),
    },
    {
      name: "Sektörel Headwind",
      trigger: "Sektörde negatif haber/rekabet",
      priceImpact: -0.15, // -15% scenario
      probability: 0.25,
      stopsAtLoss: checkStopLoss(currentPrice * 0.85, stopLoss),
    },
    {
      name: "Earnings Miss",
      trigger: "Rehber düşürülü / beklenti kaçırılı",
      priceImpact: -0.1, // -10% scenario
      probability: 0.3,
      stopsAtLoss: checkStopLoss(currentPrice * 0.9, stopLoss),
    },
  ];

  const passCount = scenarios.filter((s) => !s.stopsAtLoss).length;
  const failCount = scenarios.filter((s) => s.stopsAtLoss).length;

  let recommendation: "PASS" | "CAUTION" | "FAIL";
  let adjustment = 1.0;

  if (passCount === 3) {
    recommendation = "PASS";
    adjustment = 1.0;
  } else if (passCount >= 2) {
    recommendation = "CAUTION";
    adjustment = 0.9; // 10% reduce
  } else {
    recommendation = "FAIL";
    adjustment = 0.7; // 30% reduce
  }

  return {
    scenarios,
    passCount,
    failCount,
    recommendation,
    positionSizeAdjustment: adjustment,
  };
}

function checkStopLoss(scenarioPrice: number, stopLoss: number): boolean {
  return scenarioPrice <= stopLoss;
}

// ============================================================================
// ANTI-BIAS RISK ASSESSMENT
// ============================================================================

export function generateRiskAssessment(params: {
  fundamentalScore: number;
  macroScore: number;
  technicalScore: number;
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
}): RiskAssessment {
  const { fundamentalScore, macroScore, technicalScore, symbol, currentPrice, targetPrice, stopLoss } =
    params;

  const potentialGain = ((targetPrice - currentPrice) / currentPrice) * 100;
  const potentialLoss = ((currentPrice - stopLoss) / currentPrice) * 100;
  const rewardRisk = potentialGain / potentialLoss;

  // Bull case (3-4 factors)
  const bullCase: string[] = [];

  if (fundamentalScore > 65) {
    bullCase.push(`P/E sektörden %20+ düşük (Undervalued değerleme)`);
  }
  if (fundamentalScore > 70) {
    bullCase.push(`ROE sektör ortalamasından yüksek (Superior returns)`);
  }
  if (macroScore > 60) {
    bullCase.push(`Sektörel tailwind güçlü (Market tailwind)`);
  }
  if (technicalScore > 65) {
    bullCase.push(`Teknik momentum pozitif (Golden Cross)`);
  }

  // Bear case (3+ scenarios with probability)
  const bearCase = [
    {
      scenario: "Valuation Tuzağı",
      trigger: "Büyüme 12%→5% düşerse",
      impact: "-22% downside",
      probability: 0.25,
    },
    {
      scenario: "Makro Şok",
      trigger: "Faiz %1 artarsa (şu an 4%)",
      impact: "-15% impact",
      probability: 0.2,
    },
    {
      scenario: "Earnings Miss",
      trigger: "Q4 rehberi düşürülür",
      impact: "-10% drop",
      probability: 0.3,
    },
  ];

  // Worst case
  const worstCase = {
    description: "Tüm negatif senaryolar aynı anda",
    potentialLoss: potentialLoss * (rewardRisk > 1.5 ? 0.8 : 1.0), // Protected if good R:R
    protected: stopLoss > currentPrice * 0.85, // At least 15% stop
  };

  return {
    bullCase: bullCase.length > 0 ? bullCase : ["Unknown strengths"],
    bearCase,
    worstCase,
  };
}

// ============================================================================
// ENTRY ZONE CALCULATION
// ============================================================================

export function calculateEntryZone(params: {
  currentPrice: number;
  technicalScore: number;
  regimeName: string; // TREND, RANGE
}): { lowerBound: number; upperBound: number } {
  const { currentPrice, technicalScore, regimeName } = params;

  let entryRange = 0.02; // 2% default

  // In trend, wait for pullback = wider range
  if (regimeName === "TREND" && technicalScore > 70) {
    entryRange = 0.03; // 3% range
  }

  // In range, tighter entry
  if (regimeName === "RANGE") {
    entryRange = 0.015; // 1.5% range
  }

  return {
    lowerBound: currentPrice * (1 - entryRange),
    upperBound: currentPrice * (1 + entryRange),
  };
}

// ============================================================================
// CONFIDENCE LEVEL
// ============================================================================

export function calculateConfidenceLevel(params: {
  fundamentalScore: number;
  macroScore: number;
  technicalScore: number;
  dataQualityScore: number;
  regimeMatch: boolean; // Does decision match regime?
}): number {
  const { fundamentalScore, macroScore, technicalScore, dataQualityScore, regimeMatch } = params;

  // Weighted average of scores
  const avgScore = (fundamentalScore + macroScore + technicalScore) / 3;

  // Data quality weight
  const qualityFactor = dataQualityScore / 100;

  // Regime match bonus (+5%) or penalty (-5%)
  const regimeBonus = regimeMatch ? 0.05 : -0.05;

  const confidence = (avgScore / 100) * qualityFactor + regimeBonus;

  return Math.round(Math.max(0, Math.min(10, confidence * 10)) * 10) / 10; // 0-10 scale
}

export default {
  calculateKellyCriterion,
  calculateVAR,
  calculatePositionSize,
  calculateTrailingStop,
  runStressTest,
  generateRiskAssessment,
  calculateEntryZone,
  calculateConfidenceLevel,
};
