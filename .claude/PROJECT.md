# 🚀 AXIOM — Turkish Financial Dashboard SaaS

**Status:** Phase 1 Complete ✅ | Phase 2 Stock Analysis (Foundation) ⚒️

---

## 📊 Project Overview

AXIOM is a professional financial dashboard application designed for Turkish crypto and stock traders. It combines real-time market data, AI-powered news analysis, and community sentiment tracking.

**Live URL:** `http://localhost:3000/dashboard`

---

## ✨ Current Features (Session 1)

### **Market Data**
- ✅ Live crypto prices (Binance API)
- ✅ Stock prices (Finnhub/Yahoo Finance)
- ✅ Top 20 cryptos + S&P 500 + NASDAQ + Magnificent 7
- ✅ 24h price changes with % indicators
- ✅ Scrolling market ticker (Ninja News style)

### **News & Analysis**
- ✅ Multi-source news aggregation (7 sources: RSS + Finnhub)
- ✅ 6 news categories (All, Crypto, Stocks, Forex, Economy, General)
- ✅ AI news summary (Gemini 2.0 Flash)
- ✅ AXIOM Market Analysis (context-aware AI with price data + sentiment)
- ✅ Symbol extraction & linking
- ✅ Breaking news badges (<1h detection)

### **User Engagement**
- ✅ Community voting (👍 Bullish, 👎 Bearish, 🚨 Panic)
- ✅ Vote percentage display
- ✅ Personal favorites/watchlist
- ✅ Live price tracking on watchlist
- ✅ 24h H/L mini bar + sparkline charts
- ✅ Pulsing price change animation

### **Interactive Elements**
- ✅ Clickable symbol chips → Live 1h charts
- ✅ Embedded TradingView charts (1h/4h/1d)
- ✅ Full article modal with iframe view
- ✅ Real-time data refresh (5-20 second intervals)

---

## 🔧 Tech Stack

```
Frontend:    Next.js 16.2.3 + Turbopack + TypeScript
Charts:      TradingView Lightweight Charts v5.1.0
Styling:     Tailwind CSS + Dark Mode
State:       React Hooks + localStorage
AI:          Gemini 2.0 Flash API
Data APIs:   Binance, Finnhub, Yahoo Finance
News:        RSS parsing + Finnhub /news endpoint
Language:    Turkish (tr) + English (en)
```

---

## 📁 Project Structure

```
axiom-dashboard/
├── .claude/
│   ├── PROJECT.md ← You are here
│   ├── launch.json
│   └── ARCHITECTURE.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── quote/route.ts (Bulk prices)
│   │   │   ├── ai/summarize/route.ts (AI summary)
│   │   │   ├── ticker/route.ts (Top 20 + Indices)
│   │   │   └── analysis/market/route.ts (Market analysis)
│   │   ├── [locale]/ (i18n routing)
│   │   └── dashboard/page.tsx
│   ├── components/
│   │   ├── news/ (NewsDetail, NewsModal, NewsList, FavoritesBar)
│   │   ├── ticker/ (MarketTicker - scrolling)
│   │   ├── charts/ (PriceChart - embedded)
│   │   └── tabs/ (NewsTab - main container)
│   └── lib/
│       ├── news-sources.ts (Pluggable RSS/API sources)
│       └── news-storage.ts (localStorage helpers)
├── .env.local (Config: FINNHUB_API_KEY, GEMINI_API_KEY)
└── package.json
```

---

## 🎯 Current Session Deliverables

### APIs Created:
1. `/api/quote` — Bulk crypto + stock prices
2. `/api/ticker` — Top 20 + market indices
3. `/api/ai/summarize` — News summary generation
4. `/api/analysis/market` — Market-aware analysis

### Components Built:
1. `MarketTicker` — Continuous scrolling ticker
2. `NewsDetail` — Enhanced with AI summary + market analysis
3. `NewsModal` — Full article view + analysis
4. `FavoritesBar` — Live prices + charts

### Integrations:
- ✅ Gemini AI (2 endpoints: summary + analysis)
- ✅ Binance API (real-time crypto)
- ✅ Finnhub API (stocks + indices)
- ✅ TradingView Charts (embedded)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open in browser
http://localhost:3000/dashboard

# Environment variables needed:
# .env.local:
NEXT_PUBLIC_FINNHUB_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

---

## 📋 Session 1 Achievements

| Category | Metric |
|----------|--------|
| **APIs Created** | 4 (quote, ticker, ai/summarize, analysis/market) |
| **Components Modified** | 6 (NewsDetail, NewsModal, FavoritesBar, NewsList, NewsTab, + MarketTicker) |
| **Features Added** | 15+ (ticker, analysis, live prices, charts, etc) |
| **Lines of Code** | ~2000+ (new + modified) |
| **API Integrations** | 3 (Binance, Finnhub, Gemini) |
| **Time to Implement** | 1 Session (~4 hours) |

---

## 🆕 Phase 2 Stock Analysis (Foundation Complete)

### **APIs Created:**
1. `/api/stock/search` — Stock symbol lookup (Finnhub)
2. `/api/stock/fundamentals` — Company profile + financial metrics
3. `/api/stock/technicals` — RSI, MACD, Bollinger Bands, Moving Averages
4. `/api/stock/earnings` — Earnings calendar + historical surprises
5. `/api/stock/analysis` — AI-powered Buy/Sell/Hold recommendations (Gemini)

### **Components Built:**
1. `StockSearch.tsx` — Autocomplete search with dropdown
2. `StockHeader.tsx` — Company info + price card
3. `FundamentalsTab.tsx` — Financial metrics display
4. `TechnicalsTab.tsx` — Technical indicators + RSI gauge
5. `AnalystTab.tsx` — AI recommendation with confidence & target price
6. `StockPage.tsx` — Main container with tab navigation

### **Architecture:**
- Route: `/dashboard/stocks` (main page)
- Route: `/dashboard/stocks/[symbol]` (dynamic detail page)
- 3-tab interface: Fundamentals | Technicals | Analyst
- Real-time indicator calculations (RSI, MACD, BB)
- Gemini AI integration for market recommendations

### **Feature Status:**
- ✅ Stock search + symbol lookup
- ✅ Fundamental metrics display (P/E, ROE, Debt/Equity pending Premium)
- ✅ Real-time technical indicators
- ✅ AI-powered recommendation engine
- ⏳ Earnings calendar (Premium Finnhub required)
- ⏳ Integration with main dashboard

### **Cost Analysis:**
- **Finnhub Premium Upgrade:** $9/month (enables detailed fundamentals + earnings)
- **Gemini API Usage:** ~$0.05 per analysis (~$1.50/mo for 30 analyses)
- **Total Phase 2 Cost:** ~$10-15/month

### **Next Steps:**
1. Integrate StockPage into `/dashboard` route
2. Add link from News detail to stock analysis
3. Upgrade Finnhub to Premium (for P/E, ROE, earnings calendar)
4. Test with multiple symbols (AAPL, MSFT, ASELS, etc.)
5. Add historical chart integration (TradingView)

---

## 🔮 Phase 3+ Roadmap

### **Stock Analysis Section** (Priority 1)
- [ ] Fundamental analysis (P/E, ROE, Debt Ratio)
- [ ] Technical indicators (RSI, MACD, Bollinger)
- [ ] Earnings calendar + forecasts
- [ ] AI stock recommendation (Buy/Sell/Hold)
- [ ] Portfolio tracking + PnL calculation

### **Price Alerts** (Priority 2)
- [ ] Price level alerts (BTC > $75k)
- [ ] Web notifications
- [ ] Email alerts
- [ ] Mobile push notifications

### **Advanced Analytics** (Priority 3)
- [ ] AI sentiment scoring
- [ ] Correlation analysis (crypto ↔ stocks ↔ macro)
- [ ] Market microstructure analysis
- [ ] Trend predictions

### **Community Features** (Priority 4)
- [ ] User leaderboard (best predictions)
- [ ] Follow other traders
- [ ] Share analysis/ideas
- [ ] Discussion forums

### **Monetization** (Priority 5)
- [ ] Freemium tier system
- [ ] Premium features (advanced alerts, AI analysis)
- [ ] API access for partners
- [ ] White-label options

---

## 🔗 Important Links

- **Repository:** `/Users/mehmetgulec/Documents/AXIOM/axiom-dashboard`
- **Live Server:** `http://localhost:3000`
- **Dashboard:** `http://localhost:3000/dashboard`
- **API Docs:** See `/src/app/api/*/route.ts` files

---

## 📞 Support & Notes

- **Timezone:** Turkey (UTC+3)
- **Language:** Turkish primary, English secondary
- **Target Users:** Crypto/stock traders in Turkey
- **Competitive Set:** Ninja News, CoinMarketCap, TradingView

---

**Last Updated:** 2026-04-18
**Session:** Phase 1 Complete
**Next Session:** Stock analysis + alerts
