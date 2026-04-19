# 📈 AXIOM Phase 2 — Stock Analysis Section

**Status:** Planning Phase  
**Target:** Stock fundamental analysis + Technical indicators + AI recommendations

---

## 🎯 Phase 2 Overview

Extend AXIOM from news-driven sentiment analysis to comprehensive **stock analysis dashboard** where:
- Users can search any US/TR stock
- See fundamental metrics (P/E, ROE, Debt, Dividend)
- View technical indicators (RSI, MACD, Bollinger Bands)
- Get AI-powered Buy/Sell/Hold recommendations
- Track earnings calendar & forecasts
- Build personal portfolio with PnL tracking

---

## 📐 Architecture: Stock Analysis Section

```
ROUTE: /dashboard/stocks (new tab)

┌─────────────────────────────────────────────────────┐
│                   NAVBAR                            │
├──────────────────────────────────────────────────────┤
│  [STOCKS TAB] [NEWS TAB] [PORTFOLIO TAB (Phase 3)]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  SEARCH BAR: "AAPL" / "ASELS" (TR)                  │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ STOCK HEADER                                    │ │
│  │ AAPL | Apple Inc | $185.50 ↑2.5%               │ │
│  │ Founded: 1976 | Sector: Tech | Cap: $2.8T      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 3-TAB SECTION:                                  │ │
│  │  [FUNDAMENTALS] [TECHNICALS] [ANALYST]         │ │
│  │                                                 │ │
│  │  FUNDAMENTALS TAB:                              │ │
│  │  ├─ P/E Ratio: 28.5 (vs industry avg: 22.3)    │ │
│  │  ├─ ROE: 112% ✓ (strong)                        │ │
│  │  ├─ Debt/Equity: 0.08 (very low)                │ │
│  │  ├─ Current Ratio: 1.34                         │ │
│  │  ├─ Free Cash Flow: $110.5B                     │ │
│  │  ├─ Dividend Yield: 0.42%                       │ │
│  │  └─ Forward Earnings Growth: 12.3%              │ │
│  │                                                 │ │
│  │  TECHNICALS TAB:                                │ │
│  │  ├─ 1h/4h/1d/1w Chart (TradingView)             │ │
│  │  ├─ RSI (14): 62.5 (neutral)                    │ │
│  │  ├─ MACD: Bullish divergence                    │ │
│  │  ├─ BB (20,2): Price in middle band             │ │
│  │  ├─ 50/200 MA: Golden cross ↑                   │ │
│  │  └─ Volume Profile: Normal                      │ │
│  │                                                 │
│  │  ANALYST TAB:                                   │ │
│  │  ├─ AI Recommendation: BUY ✓                    │ │
│  │  ├─ Confidence: 78%                             │ │
│  │  ├─ Target Price: $195 (+5.1% upside)          │ │
│  │  ├─ Analysis Reasoning:                         │ │
│  │  │  "Strong fundamentals, positive technicals,  │ │
│  │  │   upcoming earnings beat expectations..."     │ │
│  │  └─ Risk Rating: MODERATE                       │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ EARNINGS CALENDAR                               │ │
│  │ Next Earnings: 2026-04-30 (13 days)             │ │
│  │ Last EPS: $1.95 | Expected: $2.10 | Beat: 5%   │ │
│  │ Previous Surprise: +8% (beat)                   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Roadmap

### **Stage 1: Data Aggregation APIs** (3 hours)

#### 1.1 `/api/stock/search` — Stock lookup
```typescript
GET /api/stock/search?q=AAPL

Response:
{
  results: [
    { symbol: "AAPL", name: "Apple Inc", sector: "Technology", country: "US" },
    { symbol: "ASELS", name: "Arçelik A.Ş.", sector: "Electronics", country: "TR" }
  ]
}
```

**Data Source:** Finnhub `/stock/symbol` endpoint
**Cache:** 24 hours

---

#### 1.2 `/api/stock/fundamentals` — Financial metrics
```typescript
POST /api/stock/fundamentals?symbol=AAPL

Response:
{
  symbol: "AAPL",
  name: "Apple Inc",
  price: 185.50,
  marketCap: 2800000000000,
  pe: 28.5,
  roe: 0.112,      // 11.2%
  debt: 0.08,      // Debt/Equity
  currentRatio: 1.34,
  fcf: 110500000000,
  dividendYield: 0.0042,
  earningsGrowth: 0.123,
  sector: "Technology",
  industry: "Consumer Electronics",
  founded: 1976
}
```

**Data Source:** Finnhub `/stock/profile2` + `/quote` endpoints
**Cache:** 6 hours (data updates daily)

---

#### 1.3 `/api/stock/technicals` — Technical indicators
```typescript
POST /api/stock/technicals?symbol=AAPL&resolution=D

Response:
{
  symbol: "AAPL",
  resolution: "D",
  rsi: 62.5,
  macd: { histogram: 0.45, signal: -2.10, macdValue: -1.65 },
  bb: {
    upper: 188.50,
    middle: 185.20,
    lower: 181.90,
    position: "middle"  // "overbought" | "oversold" | "middle"
  },
  ma: {
    sma50: 183.20,
    sma200: 180.15,
    status: "bullish"   // "bullish" (50 > 200) | "bearish"
  },
  volumeProfile: "normal"  // or "high" / "low"
}
```

**Data Source:** TradingView via Finnhub /technical endpoint (or calculate locally)
**Cache:** 5 minutes (real-time)

---

#### 1.4 `/api/stock/earnings` — Earnings calendar & forecasts
```typescript
POST /api/stock/earnings?symbol=AAPL

Response:
{
  symbol: "AAPL",
  nextEarnings: {
    date: "2026-04-30",
    daysUntil: 13,
    expectedEps: 2.10,
    estimatedRevenue: 95500000000,
    reportTime: "after_market"  // or "before_market" | "not_specified"
  },
  lastEarnings: {
    date: "2026-01-29",
    actualEps: 2.10,
    expectedEps: 2.05,
    surprise: 0.024,  // +2.4%
    revenue: 94740000000,
    guidanceChange: "raised"  // "raised" | "lowered" | "maintained"
  },
  historicalSurprises: [
    { date: "2025-10-30", surprise: 0.08 },
    { date: "2025-07-29", surprise: -0.05 }
  ]
}
```

**Data Source:** Finnhub `/calendar/earnings` endpoint
**Cache:** 24 hours

---

#### 1.5 `/api/stock/analysis` — AI-powered recommendation
```typescript
POST /api/stock/analysis

Body:
{
  symbol: "AAPL",
  fundamentals: { pe: 28.5, roe: 0.112, ... },
  technicals: { rsi: 62.5, macd: {...}, ... },
  earnings: { nextDate: "2026-04-30", surprise: 0.024, ... },
  news: ["Recent positive earnings beat expected...", ...],
  locale: "en" | "tr"
}

Response:
{
  recommendation: "BUY" | "HOLD" | "SELL",
  confidence: 0.78,  // 0-1
  targetPrice: 195.00,
  targetPriceChange: 0.051,  // +5.1%
  rationale: "Strong fundamentals with 112% ROE, positive technicals...",
  riskFactors: ["High valuation at 28.5x P/E", "Concentration risk..."],
  opportunity: "Earnings beat potential + Tech sector momentum",
  investorStance: "ACCUMULATE" | "HOLD" | "REDUCE",
  success_probability: 0.72
}
```

**AI Model:** Gemini 2.0 Flash (same as news analysis)
**Cache:** No cache (real-time generation)

---

### **Stage 2: Frontend Components** (2 hours)

#### 2.1 New Routes
- `/dashboard/stocks` — Stock search & analysis main page
- `/dashboard/stocks/[symbol]` — Individual stock detail page (dynamic)

#### 2.2 Components to Create

**`/src/components/stocks/StockSearch.tsx`** (Search bar)
- Autocomplete dropdown powered by `/api/stock/search`
- Shows: Symbol | Name | Sector | Country
- Navigate to `/stocks/[symbol]` on select

**`/src/components/stocks/StockHeader.tsx`** (Stock info card)
- Company name, price, % change, founded year
- Market cap, sector, industry badges
- 52-week high/low mini chart

**`/src/components/stocks/FundamentalsTab.tsx`** (Financial metrics)
- P/E vs industry average (with color coding: 🟢 < avg, 🔴 > avg)
- ROE, Debt/Equity, Current Ratio (health indicators)
- Free Cash Flow, Dividend Yield
- Forward EPS Growth (bullish if > 10%)
- Fetch from `/api/stock/fundamentals`

**`/src/components/stocks/TechnicalsTab.tsx`** (Technical analysis)
- TradingView chart (reuse PriceChart component)
- RSI gauge (0-100, with zones: <30 oversold, >70 overbought)
- MACD status badge (bullish divergence, bearish, etc.)
- Bollinger Bands visualization
- MA crossover status
- Fetch from `/api/stock/technicals`

**`/src/components/stocks/AnalystTab.tsx`** (AI recommendation)
- Big recommendation badge: BUY (green) | HOLD (yellow) | SELL (red)
- Confidence score: 78% (progress bar)
- Target price with % upside/downside
- Rationale text (from AI)
- Risk factors list
- Investment stance emoji
- Fetch from `/api/stock/analysis`

**`/src/components/stocks/EarningsCard.tsx`** (Earnings calendar)
- Next earnings date + days until
- Expected EPS vs last actual
- Beat/miss % indicator
- Report time badge
- Historical surprise trend

**`/src/components/stocks/StockPage.tsx`** (Main container)
- Fetch stock data on mount
- Tab switcher: Fundamentals | Technicals | Analyst
- Loading states for each tab

---

### **Stage 3: API Implementation** (4 hours)

#### 3.1 Data Source Strategy

| Metric | Source | Free | Cost |
|--------|--------|------|------|
| Search | Finnhub `/symbol` | ✓ Free | Included |
| Fundamentals | Finnhub `/profile2` + `/quote` | ✓ Free | Included |
| Technicals | TradingView LWC (local) OR Finnhub | ✓/✅ | Mixed |
| Earnings | Finnhub `/calendar/earnings` | ⚠️ Plan only | $9/mo min |
| AI Analysis | Gemini 2.0 Flash | ✅ Paid | $2-5/1M tokens |

**Cost Analysis:**
- **Finnhub Premium (Earnings):** $9/month → covers earnings + advanced quotes
- **Gemini API (AI):** ~$0.05 per analysis (at $2.50/1M input tokens)
- **TradingView Lightweight Charts:** Already integrated, free

**Total Phase 2 Cost:** ~$10-15/month (Finnhub upgrade only)

---

#### 3.2 Implementation Priority

1. **Week 1:** Search + Fundamentals (simpler Finnhub endpoints)
2. **Week 2:** Technicals + Earnings (more complex data fetching)
3. **Week 3:** AI Analysis (Gemini integration)
4. **Week 4:** Polish + Testing

---

### **Stage 4: Database Tracking (Optional, Phase 2.5)**

For portfolio feature (Phase 3), track:
```sql
CREATE TABLE user_stocks (
  id UUID PRIMARY KEY,
  user_id UUID,
  symbol VARCHAR(10),
  qty DECIMAL,
  entry_price DECIMAL,
  entry_date TIMESTAMP,
  notes TEXT
);
```

Not needed for current Phase 2 (analysis-only).

---

## 🧪 Testing Checklist

- [ ] Search returns correct stocks (AAPL, MSFT, ASELS, etc)
- [ ] Fundamentals display correctly (P/E calculated)
- [ ] Technicals chart loads and is interactive
- [ ] RSI gauge updates in real-time
- [ ] Earnings dates are accurate (next vs last)
- [ ] AI analysis generates coherent recommendations
- [ ] Mobile responsive: Tabs stack, chart scrollable
- [ ] Error states handled (stock not found, API down)
- [ ] Caching works (no duplicate API calls)

---

## 📊 Success Metrics

✅ User can search any US/TR stock  
✅ See fundamental metrics with color-coded health  
✅ View technicals with real-time indicators  
✅ Get AI recommendation with confidence score  
✅ See next earnings date + historical surprises  
✅ Responsive on mobile/tablet  

---

## 🚀 Next Phase (Phase 3)

- Portfolio tracking (add/remove stocks, track PnL)
- Price alerts (BTC > $75k)
- Advanced analytics (correlation matrix, heatmap)
- Community features (leaderboard, ideas)

---

## 📝 Cost-Benefit Analysis

### Development Cost
- **Time:** ~8-10 hours
- **API costs:** $10-15/month (Finnhub Premium upgrade)
- **AI cost:** ~$0.05 per analysis

### User Value
✓ Professional stock analysis (competes with TradingView)  
✓ Integrated news + technicals (differentiated)  
✓ AI recommendations (unique value)  
✓ Portfolio tracking foundation (Phase 3)  

### Monetization Path
- Free: Search + Basic fundamentals + Finnhub news
- Premium ($9.99/mo): Full analysis + AI recommendations + earnings calendar
- Enterprise: API access for partners

---

**Recommendation:** PROCEED with Phase 2  
**Estimated Timeline:** 2-3 weeks  
**Risk Level:** LOW (using established APIs)  

---

**Last Updated:** 2026-04-17  
**Status:** Ready for Implementation
