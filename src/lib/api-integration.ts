/**
 * API Integration Layer for AXIOM Trading Platform
 * Prepared for TradingView, Yahoo Finance, FRED, News APIs, and Gemini AI
 *
 * This file manages all external API calls and implements caching for daily data freshness.
 * Ready to integrate real credentials on Friday.
 */

import { cache } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FundamentalMetrics {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  valuation: {
    pe: number;
    pb: number;
    evEbitda: number;
  };
  profitability: {
    roe: number;
    netMargin: number;
  };
  growth: {
    salesGrowth: number;
    epsGrowth: number;
  };
  debt: {
    currentRatio: number;
    debtRatio: number;
  };
  cashFlow: {
    freeCashFlow: string;
    dividendYield: number;
  };
  qualitative: {
    management: string;
    moat: string;
    sectorTrend: string;
  };
  lastUpdated: string;
}

export interface TechnicalData {
  symbol: string;
  timeframe: string;
  price: number;
  change: number;
  changePercent: number;
  indicators: {
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
    bollinger?: { upper: number; middle: number; lower: number };
    stochastic?: { k: number; d: number };
    atr?: number;
    sma?: number;
    ema?: number;
    volume?: number;
    fibonacci?: { level: string; price: number }[];
  };
  lastUpdated: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category: 'stocks' | 'crypto' | 'forex' | 'economy' | 'all';
  sentiment?: 'positive' | 'negative' | 'neutral';
  aiSummary?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const CACHE_DURATION_HOURS = 24; // Daily cache expiration
const CACHE_STORAGE_KEY = 'axiom_api_cache';

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private initialized = false;

  initialize() {
    if (typeof window === 'undefined') return; // Skip on server

    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
    this.initialized = true;
  }

  get<T>(key: string): T | null {
    if (!this.initialized) this.initialize();

    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    // Check if cache expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, durationHours = CACHE_DURATION_HOURS): void {
    if (!this.initialized) this.initialize();

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + durationHours * 60 * 60 * 1000,
    };

    this.cache.set(key, entry);
    this.persistToStorage();
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const obj = Object.fromEntries(this.cache);
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }

  clear(): void {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    }
  }
}

const apiCache = new APICache();

// ============================================================================
// API CONFIGURATION (PLACEHOLDER FOR FRIDAY CREDENTIALS)
// ============================================================================

const API_CONFIG = {
  // TradingView API - Coming Friday (paid)
  TRADINGVIEW: {
    enabled: false,
    apiKey: process.env.NEXT_PUBLIC_TRADINGVIEW_API_KEY || '',
    baseUrl: 'https://api.tradingview.com/v1',
  },

  // Yahoo Finance API
  YAHOO_FINANCE: {
    enabled: false,
    apiKey: process.env.NEXT_PUBLIC_YAHOO_FINANCE_API_KEY || '',
    baseUrl: 'https://yfapi.net',
  },

  // FRED (Federal Reserve Economic Data)
  FRED: {
    enabled: false,
    apiKey: process.env.NEXT_PUBLIC_FRED_API_KEY || '',
    baseUrl: 'https://api.stlouisfed.org/fred',
  },

  // News API (user will provide Friday)
  NEWS_API: {
    enabled: false,
    apiKey: process.env.NEXT_PUBLIC_NEWS_API_KEY || '',
    baseUrl: 'https://newsapi.org',
  },

  // Alpha Vantage (alternative for technical/fundamental data)
  ALPHA_VANTAGE: {
    enabled: false,
    apiKey: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '',
    baseUrl: 'https://www.alphavantage.co',
  },

  // Gemini API (for AI summarization - existing, will continue using)
  GEMINI: {
    enabled: true,
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
};

// ============================================================================
// FUNDAMENTAL ANALYSIS API
// ============================================================================

/**
 * Fetch fundamental analysis data for a symbol
 * Data sources: Yahoo Finance, FRED, Seeking Alpha, ETFdb, StockAnalysis
 *
 * TODO Friday:
 * - Replace with real Yahoo Finance API calls
 * - Fetch P/E, P/B, EV/EBITDA from Yahoo Finance
 * - Fetch ROE, Net Margin from Yahoo Finance
 * - Fetch Sales Growth, EPS Growth from Yahoo Finance
 * - Fetch Current Ratio, Debt Ratio from Yahoo Finance
 * - Fetch Free Cash Flow, Dividend Yield from Yahoo Finance
 * - Fetch Management, Moat, Sector data from StockAnalysis or Seeking Alpha
 */
export async function fetchFundamentalData(symbol: string): Promise<FundamentalMetrics | null> {
  const cacheKey = `fundamental_${symbol}`;

  // Check cache first
  const cached = apiCache.get<FundamentalMetrics>(cacheKey);
  if (cached) return cached;

  try {
    // TODO Friday: Replace with real API call
    // Example (pseudo-code):
    // const response = await fetch(
    //   `${API_CONFIG.YAHOO_FINANCE.baseUrl}/v10/finance/quoteSummary/${symbol}`,
    //   { headers: { 'X-API-KEY': API_CONFIG.YAHOO_FINANCE.apiKey } }
    // );
    // const data = await response.json();
    // return parseYahooFinanceData(data);

    // For now, return null to signal mock data should be used
    return null;
  } catch (error) {
    console.error(`Error fetching fundamental data for ${symbol}:`, error);
    return null;
  }
}

// ============================================================================
// TECHNICAL ANALYSIS API
// ============================================================================

/**
 * Fetch technical analysis data with indicators
 * Data source: TradingView API (coming Friday)
 *
 * TODO Friday:
 * - Connect to TradingView API for live chart data
 * - Fetch candlestick data for selected timeframe
 * - Calculate/fetch RSI (14), MACD, Bollinger Bands, Stochastic, ATR, SMA, EMA, Volume, Fibonacci
 * - Update chart display with real-time data
 */
export async function fetchTechnicalData(
  symbol: string,
  timeframe: string,
  indicators: string[]
): Promise<TechnicalData | null> {
  const cacheKey = `technical_${symbol}_${timeframe}`;

  // Check cache first
  const cached = apiCache.get<TechnicalData>(cacheKey);
  if (cached) return cached;

  try {
    // TODO Friday: Replace with real TradingView API call
    // Example (pseudo-code):
    // const response = await fetch(
    //   `${API_CONFIG.TRADINGVIEW.baseUrl}/quotes`,
    //   {
    //     headers: { 'Authorization': `Bearer ${API_CONFIG.TRADINGVIEW.apiKey}` },
    //     body: JSON.stringify({ symbols: [symbol], timeframe, indicators })
    //   }
    // );
    // const data = await response.json();
    // return parseTradingViewData(data);

    return null;
  } catch (error) {
    console.error(`Error fetching technical data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical chart data for embedding in TradingView widget
 * Returns data suitable for TradingViewWidget configuration
 *
 * TODO Friday:
 * - Integrate TradingView charting library
 * - Fetch OHLCV data from TradingView API
 * - Support multiple timeframes: 1D, 5D, 15D, 1H, 4H, 1 Day, 1W, 1M
 */
export async function fetchChartData(symbol: string, timeframe: string) {
  const cacheKey = `chart_${symbol}_${timeframe}`;

  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    // TODO Friday: Implement TradingView chart data fetching
    return null;
  } catch (error) {
    console.error(`Error fetching chart data for ${symbol}:`, error);
    return null;
  }
}

// ============================================================================
// NEWS API INTEGRATION
// ============================================================================

/**
 * Fetch financial news and market updates
 * Data sources: NewsAPI, Financial news feeds, Market movers
 *
 * TODO Friday:
 * - Connect to NewsAPI or similar service
 * - Fetch news for financial markets, stocks, crypto
 * - Support categories: stocks, crypto, forex, economy
 * - Filter by symbol/sector
 */
export async function fetchNews(
  category: 'stocks' | 'crypto' | 'forex' | 'economy' | 'all' = 'all',
  symbol?: string,
  limit = 10
): Promise<NewsItem[]> {
  const cacheKey = `news_${category}_${symbol || 'all'}`;

  // Check cache first
  const cached = apiCache.get<NewsItem[]>(cacheKey);
  if (cached) return cached;

  try {
    // TODO Friday: Replace with real NewsAPI call
    // Example (pseudo-code):
    // const query = symbol ? `${symbol} stock` : `${category} news`;
    // const response = await fetch(
    //   `${API_CONFIG.NEWS_API.baseUrl}/v2/everything`,
    //   {
    //     params: {
    //       q: query,
    //       sortBy: 'publishedAt',
    //       language: 'en',
    //       apiKey: API_CONFIG.NEWS_API.apiKey
    //     }
    //   }
    // );
    // const data = await response.json();
    // const parsed = parseNewsData(data.articles);
    // apiCache.set(cacheKey, parsed, 6); // 6-hour cache for news
    // return parsed;

    return [];
  } catch (error) {
    console.error(`Error fetching news for ${category}:`, error);
    return [];
  }
}

// ============================================================================
// AI SUMMARIZATION (Gemini)
// ============================================================================

/**
 * Use Gemini API to generate AI summaries of news headlines
 * This uses the EXISTING Gemini API that's already configured
 *
 * API Endpoint: POST /v1beta/models/gemini-pro:generateContent
 * Authentication: API key in query params
 * Usage: Already working - just needs news headlines as input
 */
export async function generateNewsSummary(
  headline: string,
  content: string,
  locale: 'en' | 'tr' = 'en'
): Promise<string> {
  const cacheKey = `summary_${headline.substring(0, 50)}`;

  // Check cache first
  const cached = apiCache.get<string>(cacheKey);
  if (cached) return cached;

  try {
    if (!API_CONFIG.GEMINI.enabled || !API_CONFIG.GEMINI.apiKey) {
      console.warn('Gemini API not configured');
      return content.substring(0, 150) + '...';
    }

    const prompt = locale === 'tr'
      ? `Aşağıdaki finansal haber başlığını ve içeriğini 1-2 cümle ile özetleyin:\n\nBaslık: ${headline}\n\nİçerik: ${content}`
      : `Summarize the following financial news headline and content in 1-2 sentences:\n\nHeadline: ${headline}\n\nContent: ${content}`;

    // TODO: Verify this endpoint works with current Gemini API setup
    const response = await fetch(
      `${API_CONFIG.GEMINI.baseUrl}/models/gemini-pro:generateContent?key=${API_CONFIG.GEMINI.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return content.substring(0, 150) + '...';
    }

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || content.substring(0, 150);

    // Cache the summary
    apiCache.set(cacheKey, summary, 24); // 24-hour cache

    return summary;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return content.substring(0, 150) + '...';
  }
}

// ============================================================================
// ECONOMIC DATA (FRED API)
// ============================================================================

/**
 * Fetch economic indicators from FRED (Federal Reserve Economic Data)
 * Useful for macro analysis and economic context
 *
 * TODO Friday:
 * - Connect to FRED API (free, just need API key)
 * - Fetch key indicators: GDP growth, inflation (CPI), unemployment, interest rates
 * - Use in fundamental analysis context
 */
export async function fetchEconomicIndicators(
  indicators: string[] = ['GDP', 'CPIAUCSL', 'UNRATE', 'DFF']
): Promise<Record<string, number>> {
  const cacheKey = 'economic_indicators';

  const cached = apiCache.get<Record<string, number>>(cacheKey);
  if (cached) return cached;

  try {
    // TODO Friday: Implement FRED API calls
    // Example (pseudo-code):
    // const results: Record<string, number> = {};
    // for (const indicator of indicators) {
    //   const response = await fetch(
    //     `${API_CONFIG.FRED.baseUrl}/series/observations`,
    //     {
    //       params: {
    //         series_id: indicator,
    //         api_key: API_CONFIG.FRED.apiKey,
    //         limit: 1,
    //         sort_order: 'desc'
    //       }
    //     }
    //   );
    //   const data = await response.json();
    //   results[indicator] = parseFloat(data.observations[0].value);
    // }
    // apiCache.set(cacheKey, results, 24);
    // return results;

    return {};
  } catch (error) {
    console.error('Error fetching economic indicators:', error);
    return {};
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format price with appropriate currency and decimal places
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat(
    currency === 'TRY' ? 'tr-TR' : 'en-US',
    {
      style: 'currency',
      currency: currency === 'TRY' ? 'TRY' : 'USD',
    }
  );
  return formatter.format(price);
}

/**
 * Format percentage values with locale awareness
 */
export function formatPercent(value: number, locale: 'en' | 'tr' = 'en'): string {
  const formatter = new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value / 100);
}

/**
 * Check if APIs are ready (all required credentials present)
 */
export function getAPIStatus(): Record<string, boolean> {
  return {
    tradingview: API_CONFIG.TRADINGVIEW.enabled && !!API_CONFIG.TRADINGVIEW.apiKey,
    yahooFinance: API_CONFIG.YAHOO_FINANCE.enabled && !!API_CONFIG.YAHOO_FINANCE.apiKey,
    fred: API_CONFIG.FRED.enabled && !!API_CONFIG.FRED.apiKey,
    newsApi: API_CONFIG.NEWS_API.enabled && !!API_CONFIG.NEWS_API.apiKey,
    gemini: API_CONFIG.GEMINI.enabled && !!API_CONFIG.GEMINI.apiKey,
  };
}

/**
 * Clear all cached data (useful for manual refresh)
 */
export function clearCache(): void {
  apiCache.clear();
  console.log('API cache cleared');
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { size: number; status: string } {
  return {
    size: apiCache['cache']?.size || 0,
    status: 'Ready for API integration on Friday',
  };
}

export default {
  fetchFundamentalData,
  fetchTechnicalData,
  fetchChartData,
  fetchNews,
  generateNewsSummary,
  fetchEconomicIndicators,
  formatPrice,
  formatPercent,
  getAPIStatus,
  clearCache,
  getCacheStats,
};
