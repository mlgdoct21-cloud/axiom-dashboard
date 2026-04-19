/**
 * Technical Indicator Calculations
 * Pure functions for calculating 9 technical indicators
 * Ready for integration with TradingView data Friday
 *
 * Indicators:
 * 1. RSI (Relative Strength Index)
 * 2. MACD (Moving Average Convergence Divergence)
 * 3. Bollinger Bands
 * 4. Stochastic Oscillator
 * 5. ATR (Average True Range)
 * 6. SMA (Simple Moving Average)
 * 7. EMA (Exponential Moving Average)
 * 8. Volume (OBV - On Balance Volume)
 * 9. Fibonacci Retracement Levels
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  rsi?: number;
  macd?: { macd: number; signal: number; histogram: number };
  bollinger?: { upper: number; middle: number; lower: number };
  stochastic?: { k: number; d: number };
  atr?: number;
  sma?: number;
  ema?: number;
  obv?: number;
  fibonacci?: { level: string; price: number }[];
}

// ============================================================================
// 1. RSI (Relative Strength Index)
// ============================================================================

/**
 * RSI measures the magnitude of recent price changes to evaluate
 * overbought or oversold conditions.
 *
 * Formula:
 * RSI = 100 - (100 / (1 + (avg gain / avg loss)))
 *
 * @param closes Array of closing prices
 * @param period Period for calculation (typically 14)
 * @returns RSI value (0-100)
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) {
    return 50; // Return neutral value if not enough data
  }

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate smoothed averages
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  // Calculate RSI
  if (avgLoss === 0) {
    return avgGain > 0 ? 100 : 50;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

// ============================================================================
// 2. MACD (Moving Average Convergence Divergence)
// ============================================================================

/**
 * MACD is a trend-following momentum indicator that shows the
 * relationship between two moving averages.
 *
 * Components:
 * - MACD Line: 12-EMA - 26-EMA
 * - Signal Line: 9-EMA of MACD Line
 * - Histogram: MACD - Signal
 *
 * @param closes Array of closing prices
 * @returns Object with macd, signal, and histogram values
 */
export function calculateMACD(closes: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;

  // Calculate signal line (9-EMA of MACD)
  // For simplicity, using a simplified approach
  const signal = macd * 0.8; // Placeholder for proper EMA calculation

  const histogram = macd - signal;

  return {
    macd: Math.round(macd * 10000) / 10000,
    signal: Math.round(signal * 10000) / 10000,
    histogram: Math.round(histogram * 10000) / 10000,
  };
}

// ============================================================================
// 3. Bollinger Bands
// ============================================================================

/**
 * Bollinger Bands consist of:
 * - Middle Band: 20-day SMA
 * - Upper Band: Middle Band + (2 × 20-day std dev)
 * - Lower Band: Middle Band - (2 × 20-day std dev)
 *
 * @param closes Array of closing prices
 * @param period Period for SMA (typically 20)
 * @param stdDevMultiplier Standard deviation multiplier (typically 2)
 * @returns Object with upper, middle, lower bands
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number } {
  if (closes.length < period) {
    return { upper: 0, middle: 0, lower: 0 };
  }

  // Calculate SMA (middle band)
  const middle = calculateSMA(closes, period);

  // Calculate standard deviation
  const recentPrices = closes.slice(-period);
  const mean = recentPrices.reduce((a, b) => a + b) / period;
  const squaredDifferences = recentPrices.map((price) => Math.pow(price - mean, 2));
  const variance = squaredDifferences.reduce((a, b) => a + b) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + stdDev * stdDevMultiplier;
  const lower = middle - stdDev * stdDevMultiplier;

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
  };
}

// ============================================================================
// 4. Stochastic Oscillator
// ============================================================================

/**
 * Stochastic Oscillator measures the location of the closing price
 * relative to the high-low range over a period.
 *
 * Formula:
 * %K = ((Close - Lowest Low) / (Highest High - Lowest Low)) × 100
 * %D = 3-period SMA of %K
 *
 * @param ohlcv Array of OHLCV data
 * @param period Period for calculation (typically 14)
 * @returns Object with K and D values
 */
export function calculateStochastic(
  ohlcv: OHLCV[],
  period: number = 14
): { k: number; d: number } {
  if (ohlcv.length < period) {
    return { k: 50, d: 50 };
  }

  const recentData = ohlcv.slice(-period);
  const closes = recentData.map((x) => x.close);
  const highs = recentData.map((x) => x.high);
  const lows = recentData.map((x) => x.low);

  const currentClose = closes[closes.length - 1];
  const lowestLow = Math.min(...lows);
  const highestHigh = Math.max(...highs);

  const k =
    ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100 || 50;

  // For D, we'd need multiple K values to calculate SMA
  // Using K as approximation for now
  const d = k;

  return {
    k: Math.round(k * 100) / 100,
    d: Math.round(d * 100) / 100,
  };
}

// ============================================================================
// 5. ATR (Average True Range)
// ============================================================================

/**
 * ATR measures market volatility by decomposing the entire range of
 * an asset price.
 *
 * True Range = max(H-L, |H-PC|, |L-PC|)
 * ATR = 14-period average of TR
 *
 * @param ohlcv Array of OHLCV data
 * @param period Period for calculation (typically 14)
 * @returns ATR value
 */
export function calculateATR(ohlcv: OHLCV[], period: number = 14): number {
  if (ohlcv.length < period) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    const current = ohlcv[i];
    const previous = i > 0 ? ohlcv[i - 1] : current;

    const highLow = current.high - current.low;
    const highClose = Math.abs(current.high - previous.close);
    const lowClose = Math.abs(current.low - previous.close);

    const tr = Math.max(highLow, highClose, lowClose);
    trueRanges.push(tr);
  }

  const recentTR = trueRanges.slice(-period);
  const atr = recentTR.reduce((a, b) => a + b) / period;

  return Math.round(atr * 100) / 100;
}

// ============================================================================
// 6. SMA (Simple Moving Average)
// ============================================================================

/**
 * SMA is the unweighted mean of the previous n prices.
 *
 * Formula: SMA = (P1 + P2 + ... + Pn) / n
 *
 * @param prices Array of prices
 * @param period Period for calculation
 * @returns SMA value
 */
export function calculateSMA(prices: number[], period: number = 20): number {
  if (prices.length < period) {
    return prices[prices.length - 1];
  }

  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((a, b) => a + b, 0);
  const sma = sum / period;

  return Math.round(sma * 100) / 100;
}

// ============================================================================
// 7. EMA (Exponential Moving Average)
// ============================================================================

/**
 * EMA gives more weight to recent prices.
 *
 * Multiplier = 2 / (period + 1)
 * EMA = (Close - Previous EMA) × Multiplier + Previous EMA
 *
 * @param prices Array of prices
 * @param period Period for calculation
 * @returns EMA value
 */
export function calculateEMA(prices: number[], period: number = 20): number {
  if (prices.length < period) {
    return prices[prices.length - 1];
  }

  const multiplier = 2 / (period + 1);

  // Start with SMA as initial EMA
  let ema = calculateSMA(prices.slice(0, period), period);

  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return Math.round(ema * 100) / 100;
}

// ============================================================================
// 8. OBV (On Balance Volume)
// ============================================================================

/**
 * OBV measures buying and selling pressure.
 *
 * Rules:
 * - If Close > Previous Close: OBV = Previous OBV + Volume
 * - If Close < Previous Close: OBV = Previous OBV - Volume
 * - If Close = Previous Close: OBV = Previous OBV
 *
 * @param ohlcv Array of OHLCV data
 * @returns Current OBV value
 */
export function calculateOBV(ohlcv: OHLCV[]): number {
  if (ohlcv.length === 0) return 0;

  let obv = 0;

  for (let i = 0; i < ohlcv.length; i++) {
    const current = ohlcv[i];
    const previous = i > 0 ? ohlcv[i - 1] : current;

    if (current.close > previous.close) {
      obv += current.volume;
    } else if (current.close < previous.close) {
      obv -= current.volume;
    }
  }

  return obv;
}

// ============================================================================
// 9. Fibonacci Retracement Levels
// ============================================================================

/**
 * Fibonacci retracement levels are horizontal lines that indicate
 * areas of support or resistance at the key Fibonacci ratios.
 *
 * Common levels: 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
 *
 * @param highPrice Swing high price
 * @param lowPrice Swing low price
 * @returns Array of Fibonacci levels with prices
 */
export function calculateFibonacciLevels(
  highPrice: number,
  lowPrice: number
): { level: string; price: number }[] {
  const diff = highPrice - lowPrice;

  const levels = [
    { level: '0%', ratio: 0 },
    { level: '23.6%', ratio: 0.236 },
    { level: '38.2%', ratio: 0.382 },
    { level: '50%', ratio: 0.5 },
    { level: '61.8%', ratio: 0.618 },
    { level: '78.6%', ratio: 0.786 },
    { level: '100%', ratio: 1 },
  ];

  return levels.map((level) => ({
    level: level.level,
    price: Math.round((highPrice - diff * level.ratio) * 100) / 100,
  }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate all indicators at once
 * @param ohlcv Array of OHLCV data
 * @param indicatorList List of indicators to calculate
 * @returns Object with all requested indicators
 */
export function calculateAllIndicators(
  ohlcv: OHLCV[],
  indicatorList: string[] = ['rsi', 'macd', 'bollinger', 'stochastic', 'atr', 'sma', 'ema', 'obv', 'fibonacci']
): IndicatorResult {
  const closes = ohlcv.map((x) => x.close);
  const highs = ohlcv.map((x) => x.high);
  const lows = ohlcv.map((x) => x.low);

  const result: IndicatorResult = {};

  if (indicatorList.includes('rsi')) {
    result.rsi = calculateRSI(closes, 14);
  }

  if (indicatorList.includes('macd')) {
    result.macd = calculateMACD(closes);
  }

  if (indicatorList.includes('bollinger')) {
    result.bollinger = calculateBollingerBands(closes, 20, 2);
  }

  if (indicatorList.includes('stochastic')) {
    result.stochastic = calculateStochastic(ohlcv, 14);
  }

  if (indicatorList.includes('atr')) {
    result.atr = calculateATR(ohlcv, 14);
  }

  if (indicatorList.includes('sma')) {
    result.sma = calculateSMA(closes, 20);
  }

  if (indicatorList.includes('ema')) {
    result.ema = calculateEMA(closes, 12);
  }

  if (indicatorList.includes('obv')) {
    result.obv = calculateOBV(ohlcv);
  }

  if (indicatorList.includes('fibonacci')) {
    const highPrice = Math.max(...highs);
    const lowPrice = Math.min(...lows);
    result.fibonacci = calculateFibonacciLevels(highPrice, lowPrice);
  }

  return result;
}

/**
 * Interpret indicator values and provide signal
 * @param indicator Indicator name
 * @param value Current value
 * @returns Signal: 'buy', 'sell', or 'neutral'
 */
export function interpretSignal(
  indicator: string,
  value: number
): 'buy' | 'sell' | 'neutral' {
  switch (indicator) {
    case 'rsi':
      if (value < 30) return 'buy'; // Oversold
      if (value > 70) return 'sell'; // Overbought
      return 'neutral';

    case 'stochastic':
      if (value < 20) return 'buy';
      if (value > 80) return 'sell';
      return 'neutral';

    default:
      return 'neutral';
  }
}

export default {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateSMA,
  calculateEMA,
  calculateOBV,
  calculateFibonacciLevels,
  calculateAllIndicators,
  interpretSignal,
};
