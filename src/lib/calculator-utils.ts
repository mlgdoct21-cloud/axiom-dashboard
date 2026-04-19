/**
 * Calculator Utilities
 * Pure functions for financial calculations used in trading calculators
 */

export interface PnLResult {
  pnl: number;           // Profit/Loss amount
  pnlPercent: number;   // P&L as percentage
  roi: number;          // Return on Investment %
  riskReward: number;   // Risk to Reward ratio
}

export interface RiskResult {
  positionSize: number;    // Number of shares/units
  maxLoss: number;         // Maximum loss in dollars
  riskReward: number;      // Risk to Reward ratio
  expectedValue: number;   // Expected value per trade
  portfolioRiskPercent: number; // % of portfolio at risk
}

export interface PositionResult {
  positionSize: number;      // Number of shares/contracts
  contractsCount: number;    // For futures
  marginRequired: number;    // Margin needed
  dollarRisk: number;        // Dollar amount at risk
  profitTarget: number;      // Profit target amount
}

/**
 * Calculate Profit and Loss
 */
export function calculatePnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  tradeType: 'long' | 'short' = 'long'
): PnLResult {
  if (entryPrice <= 0 || quantity <= 0) {
    return { pnl: 0, pnlPercent: 0, roi: 0, riskReward: 0 };
  }

  const priceChange = exitPrice - entryPrice;
  const pnl = tradeType === 'long' ? priceChange * quantity : -priceChange * quantity;
  const entryTotal = entryPrice * quantity;
  const pnlPercent = (pnl / entryTotal) * 100;

  // ROI calculation
  const roi = (pnl / entryTotal) * 100;

  // For P&L, risk/reward is based on price movement ratio
  const priceMovement = Math.abs(exitPrice - entryPrice);
  const riskReward = entryPrice > 0 ? priceMovement / entryPrice : 0;

  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    riskReward: Math.round(riskReward * 10000) / 10000,
  };
}

/**
 * Calculate Risk Management
 */
export function calculateRisk(
  portfolioBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  profitTarget?: number
): RiskResult {
  if (portfolioBalance <= 0 || riskPercent <= 0 || entryPrice <= 0) {
    return {
      positionSize: 0,
      maxLoss: 0,
      riskReward: 0,
      expectedValue: 0,
      portfolioRiskPercent: 0,
    };
  }

  // Maximum loss we're willing to take
  const maxLoss = portfolioBalance * (riskPercent / 100);

  // Price difference between entry and stop loss
  const priceDistance = Math.abs(entryPrice - stopLoss);

  // Position size based on risk
  const positionSize = priceDistance > 0 ? Math.floor(maxLoss / priceDistance) : 0;

  // Risk/Reward ratio
  const reward = profitTarget ? Math.abs(profitTarget - entryPrice) : priceDistance;
  const riskReward = priceDistance > 0 ? reward / priceDistance : 0;

  // Expected value (assuming 50% win rate)
  const expectedValue = (maxLoss * 0.5) - (maxLoss * 0.5) + (reward * positionSize * 0.5);

  return {
    positionSize,
    maxLoss: Math.round(maxLoss * 100) / 100,
    riskReward: Math.round(riskReward * 100) / 100,
    expectedValue: Math.round(expectedValue * 100) / 100,
    portfolioRiskPercent: riskPercent,
  };
}

/**
 * Calculate Position Sizing with Leverage
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  leverage: number = 1,
  contractSize: number = 1
): PositionResult {
  if (accountBalance <= 0 || riskPercent <= 0 || entryPrice <= 0) {
    return {
      positionSize: 0,
      contractsCount: 0,
      marginRequired: 0,
      dollarRisk: 0,
      profitTarget: 0,
    };
  }

  // Dollar amount to risk
  const dollarRisk = accountBalance * (riskPercent / 100);

  // Price distance (pips/points)
  const priceDistance = Math.abs(entryPrice - stopLoss);

  // Base position size without leverage
  const baseLots = priceDistance > 0 ? dollarRisk / priceDistance : 0;

  // Apply leverage
  const positionSize = Math.floor(baseLots * leverage * contractSize);

  // For futures/contracts
  const contractsCount = leverage > 1 ? Math.floor(positionSize / contractSize) : 0;

  // Margin required (simplified: account balance / leverage)
  const marginRequired = accountBalance / leverage;

  return {
    positionSize,
    contractsCount,
    marginRequired: Math.round(marginRequired * 100) / 100,
    dollarRisk: Math.round(dollarRisk * 100) / 100,
    profitTarget: entryPrice,
  };
}

/**
 * Format number with locale awareness
 */
export function formatNumber(
  value: number,
  locale: 'en' | 'tr' = 'en',
  decimals: number = 2
): string {
  const formatted = value.toFixed(decimals);

  if (locale === 'tr') {
    // Turkish format: 1.000,00
    const [integer, decimal] = formatted.split('.');
    const integerFormatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${integerFormatted},${decimal}`;
  } else {
    // English format: 1,000.00
    return parseFloat(formatted).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}

/**
 * Format currency
 */
export function formatCurrency(
  value: number,
  locale: 'en' | 'tr' = 'en',
  currency: string = 'USD'
): string {
  const formatted = formatNumber(value, locale, 2);

  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'TRY': '₺',
  };

  const symbol = currencySymbols[currency] || currency;

  return locale === 'tr' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}

/**
 * Calculate win rate needed for profitability
 */
export function calculateBreakEvenWinRate(riskReward: number): number {
  if (riskReward <= 0) return 0;
  return Math.round((1 / (1 + riskReward)) * 10000) / 100;
}

/**
 * Calculate profit factor
 */
export function calculateProfitFactor(grossProfit: number, grossLoss: number): number {
  if (grossLoss <= 0) return 0;
  return Math.round((grossProfit / Math.abs(grossLoss)) * 100) / 100;
}
