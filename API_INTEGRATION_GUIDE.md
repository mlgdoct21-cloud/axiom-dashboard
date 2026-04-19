# AXIOM Trading Platform - API Integration Guide

**Status:** Ready for API integration on Friday  
**Created:** April 13, 2026  
**Last Updated:** April 13, 2026

---

## Overview

This document provides a step-by-step guide for integrating real APIs into the AXIOM trading platform when credentials are received on Friday.

The platform currently uses **mock data** in all tabs. Each tab has a clear TODO marker showing exactly where to replace mock data with real API calls.

---

## API Integration Checklist

### Friday: Credential Handoff

- [ ] Receive TradingView API credentials (paid)
- [ ] Receive News API credentials (NewsAPI or alternative)
- [ ] Verify access to Yahoo Finance API
- [ ] Verify access to FRED API (free with signup)
- [ ] Test Gemini API connection (already configured)

### Step 1: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your API credentials to `.env.local`:
   ```
   NEXT_PUBLIC_TRADINGVIEW_API_KEY=<key_from_friday>
   NEXT_PUBLIC_YAHOO_FINANCE_API_KEY=<key>
   NEXT_PUBLIC_FRED_API_KEY=<key>
   NEXT_PUBLIC_NEWS_API_KEY=<key>
   NEXT_PUBLIC_GEMINI_API_KEY=<existing_key>
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

---

## Tab-by-Tab Integration Guide

### 📰 NEWS TAB
**File:** `/src/components/tabs/NewsTab.tsx`  
**Current State:** Mock data with 3 sample news items  
**Integration Time:** 30 minutes

#### Current Mock Data Structure:
```typescript
const mockNews: NewsItem[] = [
  {
    id: '1',
    title: t('news.item1.title'),
    source: 'MarketWatch',
    publishedAt: '2026-04-13T10:30:00Z',
    // ... more fields
  },
  // ... more items
];
```

#### Integration Steps:

1. **Update `fetchNews()` in `/src/lib/api-integration.ts`:**
   ```typescript
   export async function fetchNews(
     category: 'stocks' | 'crypto' | 'forex' | 'economy' | 'all' = 'all',
     symbol?: string,
     limit = 10
   ): Promise<NewsItem[]> {
     const cacheKey = `news_${category}_${symbol || 'all'}`;
     const cached = apiCache.get<NewsItem[]>(cacheKey);
     if (cached) return cached;

     try {
       // TODO FRIDAY: Uncomment real API call
       const response = await fetch(
         `${API_CONFIG.NEWS_API.baseUrl}/v2/everything`,
         {
           params: {
             q: symbol ? `${symbol} stock` : `${category} news`,
             sortBy: 'publishedAt',
             language: 'en',
             apiKey: API_CONFIG.NEWS_API.apiKey
           }
         }
       );
       const data = await response.json();
       const parsed = parseNewsData(data.articles);
       apiCache.set(cacheKey, parsed, 6); // 6-hour cache for news
       return parsed;
     } catch (error) {
       console.error(`Error fetching news:`, error);
       return [];
     }
   }
   ```

2. **In `NewsTab.tsx`, replace mock data with API call:**
   ```typescript
   // BEFORE (current):
   const [news, setNews] = useState<NewsItem[]>(mockNews);

   // AFTER (with API):
   useEffect(() => {
     fetchNews(selectedCategory).then(setNews);
   }, [selectedCategory]);
   ```

3. **Add AI summarization:**
   ```typescript
   const summarizedNews = await Promise.all(
     news.map(async (item) => ({
       ...item,
       aiSummary: await generateNewsSummary(item.title, item.summary)
     }))
   );
   ```

4. **Data Freshness:**
   - News cache: **6 hours** (news changes frequently)
   - Implement manual refresh button for immediate updates

---

### 📊 FUNDAMENTAL ANALYSIS TAB
**File:** `/src/components/tabs/FundamentalTab.tsx`  
**Current State:** Mock data for AAPL  
**Integration Time:** 1.5 hours

#### Current Mock Data:
```typescript
const mockData: FundamentalData = {
  symbol: selectedSymbol,
  name: 'Apple Inc.',
  price: 185.50,
  valuation: { pe: 28.5, pb: 45.2, evEbitda: 22.3 },
  // ... more metrics
};
```

#### Integration Steps:

1. **Primary Data Source: Yahoo Finance**
   - Get latest price, key metrics
   - Endpoint: `/v10/finance/quoteSummary/{symbol}`
   
2. **Update `fetchFundamentalData()` in `/src/lib/api-integration.ts`:**
   ```typescript
   export async function fetchFundamentalData(symbol: string): Promise<FundamentalMetrics | null> {
     const cacheKey = `fundamental_${symbol}`;
     const cached = apiCache.get<FundamentalMetrics>(cacheKey);
     if (cached) return cached;

     try {
       // TODO FRIDAY: Uncomment real API call
       const response = await fetch(
         `${API_CONFIG.YAHOO_FINANCE.baseUrl}/v10/finance/quoteSummary/${symbol}`,
         {
           headers: { 'X-API-KEY': API_CONFIG.YAHOO_FINANCE.apiKey }
         }
       );
       const data = await response.json();
       const parsed = parseYahooFinanceData(data);
       apiCache.set(cacheKey, parsed);
       return parsed;
     } catch (error) {
       console.error(`Error fetching fundamental data:`, error);
       return null;
     }
   }
   ```

3. **Create parser function for Yahoo Finance response:**
   ```typescript
   function parseYahooFinanceData(data: any): FundamentalMetrics {
     const quoteData = data.quoteSummary.result[0];
     return {
       symbol: data.symbol,
       name: quoteData.price.longName,
       price: quoteData.price.regularMarketPrice.raw,
       currency: quoteData.price.currency,
       valuation: {
         pe: quoteData.summaryDetail.trailingPE?.raw || 0,
         pb: quoteData.summaryDetail.priceToBook?.raw || 0,
         evEbitda: quoteData.summaryDetail.enterpriseToEbitda?.raw || 0,
       },
       profitability: {
         roe: quoteData.financialData.returnOnEquity?.raw || 0,
         netMargin: quoteData.financialData.profitMargins?.raw || 0,
       },
       growth: {
         salesGrowth: quoteData.financialData.revenueGrowth?.raw || 0,
         epsGrowth: quoteData.financialData.earningsGrowth?.raw || 0,
       },
       debt: {
         currentRatio: quoteData.financialData.currentRatio?.raw || 0,
         debtRatio: quoteData.financialData.debtToEquity?.raw || 0,
       },
       cashFlow: {
         freeCashFlow: formatPrice(quoteData.financialData.freeCashflow?.raw || 0),
         dividendYield: quoteData.summaryDetail.dividendYield?.raw || 0,
       },
       qualitative: {
         management: quoteData.assetProfile.sector || 'N/A',
         moat: 'TBD', // Requires Seeking Alpha or manual input
         sectorTrend: 'Growing', // From FRED economic data
       },
       lastUpdated: new Date().toISOString(),
     };
   }
   ```

4. **In `FundamentalTab.tsx`, replace mock data:**
   ```typescript
   // BEFORE (current):
   const [fundamentals] = useState(mockData);

   // AFTER (with API):
   const [fundamentals, setFundamentals] = useState<FundamentalData | null>(null);
   
   useEffect(() => {
     fetchFundamentalData(selectedSymbol).then(setFundamentals);
   }, [selectedSymbol]);
   ```

5. **Data Freshness:**
   - Fundamental data cache: **24 hours** (changes daily)
   - Add "Last Updated" timestamp to UI
   - Manual refresh button available

---

### 📈 TECHNICAL ANALYSIS TAB
**File:** `/src/components/tabs/TechnicalTab.tsx`  
**Current State:** Chart placeholder, mock indicator list  
**Integration Time:** 2 hours

#### Current State:
```typescript
// Chart shows placeholder "Real chart will be displayed after TradingView API"
// Indicators list available but no calculations
```

#### Integration Steps:

1. **Set up TradingView Chart Embedding:**
   ```bash
   npm install @tradingview/charting_library
   ```

2. **Create `TradingViewChart.tsx` component:**
   ```typescript
   // /src/components/charts/TradingViewChart.tsx
   import { TradingViewChart } from '@tradingview/charting_library';

   export default function TradingViewChart({ symbol, timeframe }: Props) {
     return (
       <TradingViewChart
         symbol={symbol}
         interval={convertTimeframe(timeframe)} // 1D, 5D, 1H, 4H, 1W, 1M
         theme="dark"
         style="0" // Candles
         toolbar_bg="#0f172a"
       />
     );
   }
   ```

3. **Integrate chart into TechnicalTab:**
   ```typescript
   // In TechnicalTab.tsx, replace placeholder:
   // BEFORE:
   <div className="... min-h-96 ...">
     <div className="text-center">📈 {t('loading')}</div>
   </div>

   // AFTER:
   <TradingViewChart symbol={selectedSymbol} timeframe={selectedTimeframe} />
   ```

4. **Integrate indicator calculations:**
   ```typescript
   // Update fetchTechnicalData() to calculate indicators:
   export async function fetchTechnicalData(
     symbol: string,
     timeframe: string,
     indicators: string[]
   ): Promise<TechnicalData | null> {
     try {
       // Fetch OHLCV candlestick data
       const candleData = await fetchChartData(symbol, timeframe);
       
       // Calculate each indicator
       const calculatedIndicators: any = {};
       
       if (indicators.includes('rsi')) {
         calculatedIndicators.rsi = calculateRSI(candleData.closes, 14);
       }
       if (indicators.includes('macd')) {
         calculatedIndicators.macd = calculateMACD(candleData.closes);
       }
       // ... etc for other indicators
       
       return {
         symbol,
         timeframe,
         indicators: calculatedIndicators,
         lastUpdated: new Date().toISOString(),
       };
     } catch (error) {
       console.error('Error:', error);
       return null;
     }
   }
   ```

5. **Add indicator calculation helpers:**
   ```typescript
   // /src/lib/indicators.ts
   export function calculateRSI(closes: number[], period = 14): number {
     // RSI formula implementation
   }
   export function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
     // MACD formula implementation
   }
   // ... etc
   ```

6. **Data Freshness:**
   - Chart data cache: **1 hour** (price data updates frequently)
   - Real-time updates recommended for active traders
   - Update indicator display when timeframe/symbol changes

---

### 💰 CALCULATOR TAB
**File:** `/src/components/tabs/CalculatorTab.tsx`  
**Current State:** Uses existing calculator components (COMPLETE)  
**Integration Time:** 0 minutes (already working)

✅ **No changes needed** - Calculator tab uses client-side calculations only
- P&L Calculator: Working
- Risk Calculator: Working
- Position Sizing Calculator: Working

---

### 💳 PRICING TAB
**File:** `/src/components/tabs/PricingTab.tsx`  
**Current State:** Static pricing (COMPLETE)  
**Integration Time:** 0 minutes (no API needed)

✅ **No changes needed** - Pricing is static and should not change frequently

---

## Secondary Data Sources

### Seeking Alpha (for qualitative data)
- Management Quality assessment
- Competitive Moat rating
- Industry positioning

**Options:**
1. Manual entry (UI form for analysts to input)
2. Web scraping (verify ToS compliance)
3. Premium API partner

### FRED API (for sector/economic context)
```typescript
export async function fetchEconomicIndicators() {
  // Fetch key macro indicators
  const gdpGrowth = await fetchFREDSeries('A191RL1Q225SBEA');
  const inflation = await fetchFREDSeries('CPIAUCSL');
  const unemployment = await fetchFREDSeries('UNRATE');
  const fedRate = await fetchFREDSeries('DFF');
  
  return { gdpGrowth, inflation, unemployment, fedRate };
}
```

---

## API Status Monitoring

### Check API Status:
```typescript
import { getAPIStatus } from '@/lib/api-integration';

const status = getAPIStatus();
// Returns: {
//   tradingview: boolean,
//   yahooFinance: boolean,
//   fred: boolean,
//   newsApi: boolean,
//   gemini: boolean
// }
```

### View Cache Statistics:
```typescript
import { getCacheStats } from '@/lib/api-integration';

const stats = getCacheStats();
// { size: 12, status: 'Ready' }
```

### Clear Cache (for testing):
```typescript
import { clearCache } from '@/lib/api-integration';

clearCache(); // Removes all cached data
```

---

## Error Handling Strategy

### Fallback Logic (when API fails):
1. **Check cache first** - If data exists and not expired, use it
2. **Fallback to mock data** - Keep mock data as backup
3. **Show error message** - Alert user to API issues
4. **Retry mechanism** - Auto-retry failed requests (exponential backoff)

### Implementation Example:
```typescript
async function getSymbolData(symbol: string) {
  try {
    // Try real API
    const data = await fetchFundamentalData(symbol);
    if (data) return data;
  } catch (error) {
    console.error('API error:', error);
  }

  // Fallback to cache
  const cached = getFromCache(`fundamental_${symbol}`);
  if (cached) return cached;

  // Final fallback to mock
  return getMockData(symbol);
}
```

---

## Performance Optimization

### Caching Strategy:
- **News:** 6 hours (content changes frequently)
- **Fundamental data:** 24 hours (daily updates)
- **Technical data:** 1 hour (prices change frequently)
- **Economic indicators:** 24 hours (released daily/weekly)

### Lazy Loading:
```typescript
// Load data only when tab is opened
useEffect(() => {
  if (activeTab === 'fundamental') {
    fetchFundamentalData(symbol);
  }
}, [activeTab, symbol]);
```

### Parallel Requests:
```typescript
// Fetch multiple symbols at once
const results = await Promise.all([
  fetchFundamentalData('AAPL'),
  fetchFundamentalData('MSFT'),
  fetchFundamentalData('GOOG'),
]);
```

---

## Testing Checklist (Friday)

- [ ] **News Tab**
  - [ ] Headlines fetch from NewsAPI
  - [ ] Categories filter correctly
  - [ ] AI summaries generate via Gemini
  - [ ] 6-hour cache works

- [ ] **Fundamental Tab**
  - [ ] Data fetches for US stocks (AAPL, MSFT, etc.)
  - [ ] Data fetches for Turkish stocks (GARAN, IS, etc.)
  - [ ] Metrics calculate correctly
  - [ ] 24-hour cache works
  - [ ] Currency formatting (USD vs TRY)

- [ ] **Technical Tab**
  - [ ] TradingView chart renders
  - [ ] Indicators calculate correctly
  - [ ] Timeframe selection works
  - [ ] 1-hour cache works
  - [ ] Multiple indicators display simultaneously

- [ ] **Cross-tab**
  - [ ] Language switching (EN/TR) works
  - [ ] Symbol selection consistent across tabs
  - [ ] Error messages display clearly
  - [ ] Manual refresh button works

---

## Deployment Checklist

- [ ] All API keys in production `.env` file
- [ ] Caching configured correctly
- [ ] Error handling tested
- [ ] Performance acceptable (Lighthouse >85)
- [ ] Turkish & English content verified
- [ ] Social links in footer tested
- [ ] Mobile responsiveness verified
- [ ] Security: No sensitive data in console logs

---

## Post-Launch Monitoring

### Metrics to Track:
- API response times
- Cache hit ratio
- Error rates per API
- User session duration by tab
- Most popular symbols
- Most popular indicators

### Alerts to Set:
- API downtime (>2 minutes)
- High error rate (>5%)
- Cache miss rate (>30%)
- Response time (>3 seconds)

---

## Support & Troubleshooting

### Common Issues:

**Issue: "API returned 401 Unauthorized"**
- Check API key in `.env.local`
- Verify API key hasn't expired
- Confirm API key permissions

**Issue: "Cache not clearing"**
```typescript
// Force clear cache:
localStorage.removeItem('axiom_api_cache');
```

**Issue: "Symbol not found"**
- Check symbol exists in data source
- Verify symbol is in correct format (AAPL vs aapl)
- Add symbol to symbol list if new

**Issue: "Gemini AI summary not generating"**
- Verify Gemini API key is active
- Check rate limits
- Test with simple prompt

---

## Contact & Questions

For issues or questions during API integration:
1. Check this guide first
2. Review code comments marked `// TODO FRIDAY:`
3. Check API documentation links above
4. Review error logs in browser console

---

**Document Prepared By:** Claude AI  
**Ready for:** Friday API Integration  
**Last Verified:** April 13, 2026
