# 🏗️ AXIOM — Turkish Financial Dashboard SaaS

**Real-time market data • AI-powered analysis • Community insights**

![Status](https://img.shields.io/badge/Phase-1%20%E2%9C%85%20%7C%202%20⚒%EF%B8%8F-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-95%25-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.2.3-black)

---

## 📊 Features

### Phase 1: News & Sentiment ✅
- 📰 Multi-source news aggregation (7 sources: RSS + Finnhub)
- 🤖 AI news summarization using Gemini 2.0 Flash
- 📈 Live price tracking with sparklines
- 🎯 Community voting (Bullish/Bearish/Panic)
- 📊 AXIOM Market Analysis (context-aware AI commentary)
- 💹 Scrolling market ticker (Top 20 cryptos + indices + Mag7)
- 🎨 3-column CryptoPanic-style layout

### Phase 2: Stock Analysis ⚒️
- 🔍 Stock search with autocomplete
- 📋 Fundamental analysis (P/E, ROE, Debt/Equity, etc)
- 📈 Technical indicators (RSI, MACD, Bollinger Bands, MA)
- 📅 Earnings calendar + historical surprises
- 🤖 AI-powered Buy/Sell/Hold recommendations with confidence scores
- 💰 Target price predictions
- ⚠️ Risk assessment + key strengths/factors

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env.local with API keys
echo "NEXT_PUBLIC_FINNHUB_API_KEY=your_key_here" > .env.local
echo "GEMINI_API_KEY=your_key_here" >> .env.local

# Start development server
npm run dev

# Open in browser
http://localhost:3000/dashboard
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           USER BROWSER                      │
│  Dashboard (3-Column Layout)                │
│  [Market Ticker] [News | Detail | Watchlist]
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│        NEXT.JS SERVER (API)                 │
│  /api/news          (RSS + Finnhub)         │
│  /api/quote         (Binance + Finnhub)     │
│  /api/ticker        (Top 20 + Indices)      │
│  /api/ai/summarize  (Gemini news summary)   │
│  /api/analysis/*    (AI market analysis)    │
│  /api/stock/*       (Stock analysis APIs)   │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│      EXTERNAL DATA SOURCES                  │
│  Finnhub (stocks, news, quotes)             │
│  Binance (crypto prices)                    │
│  TradingView (charts)                       │
│  Gemini API (AI analysis)                   │
└─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
axiom-dashboard/
├── .claude/
│   ├── PROJECT.md                    # Project overview
│   ├── ARCHITECTURE.md               # System architecture
│   ├── PHASE2_STOCK_ANALYSIS.md      # Stock analysis roadmap
│   ├── PHASE2_IMPLEMENTATION_SUMMARY.md  # Implementation details
│   ├── QUICK_START_PHASE2.md         # Testing guide
│   ├── launch.json                   # Dev server config
│   ├── project.json                  # Project metadata
│   └── CLAUDE.md                     # Next.js version notes
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── news/
│   │   │   ├── quote/
│   │   │   ├── ticker/
│   │   │   ├── ai/summarize/
│   │   │   ├── analysis/market/
│   │   │   └── stock/
│   │   │       ├── search/
│   │   │       ├── fundamentals/
│   │   │       ├── technicals/
│   │   │       ├── earnings/
│   │   │       └── analysis/
│   │   └── dashboard/
│   ├── components/
│   │   ├── news/          (NewsDetail, NewsModal, NewsList, FavoritesBar)
│   │   ├── ticker/        (MarketTicker)
│   │   ├── charts/        (PriceChart)
│   │   ├── stocks/        (StockSearch, StockHeader, FundamentalsTab, TechnicalsTab, AnalystTab, StockPage)
│   │   └── tabs/          (NewsTab)
│   └── lib/
│       ├── news-sources.ts
│       └── news-storage.ts
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 16.2.3 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **Charts** | TradingView Lightweight Charts | 5.1.0 |
| **Charting (Alt)** | Recharts | 3.8.1 |
| **Dates** | date-fns | 4.1.0 |
| **i18n** | next-intl | 4.9.1 |
| **AI** | Gemini 2.0 Flash | Latest |
| **Data APIs** | Finnhub, Binance, Yahoo Finance | Live |

---

## 📊 API Reference

### News APIs
- `GET /api/news` — Aggregated news from 7 sources
- `POST /api/ai/summarize` — AI news summary (Gemini)
- `POST /api/analysis/market` — Market impact analysis

### Price APIs
- `GET /api/quote` — Bulk price quotes (crypto + stocks)
- `GET /api/ticker` — Market ticker data (Top 20 + indices)

### Stock Analysis APIs
- `GET /api/stock/search` — Stock symbol lookup
- `GET /api/stock/fundamentals` — Company profile + metrics
- `GET /api/stock/technicals` — Technical indicators
- `GET /api/stock/earnings` — Earnings calendar
- `POST /api/stock/analysis` — AI recommendation

See [ARCHITECTURE.md](./.claude/ARCHITECTURE.md) for detailed specs.

---

## 📖 Documentation

- **[PROJECT.md](./.claude/PROJECT.md)** — Complete project overview + features
- **[ARCHITECTURE.md](./.claude/ARCHITECTURE.md)** — System design + data flows
- **[PHASE2_STOCK_ANALYSIS.md](./.claude/PHASE2_STOCK_ANALYSIS.md)** — Stock analysis roadmap
- **[PHASE2_IMPLEMENTATION_SUMMARY.md](./.claude/PHASE2_IMPLEMENTATION_SUMMARY.md)** — Technical deep-dive
- **[QUICK_START_PHASE2.md](./.claude/QUICK_START_PHASE2.md)** — Testing guide

---

## 🧪 Testing

### Run Dev Server
```bash
npm run dev
# Opens http://localhost:3000
```

### Test APIs
```bash
# News aggregation
curl http://localhost:3000/api/news

# Stock search
curl "http://localhost:3000/api/stock/search?q=AAPL"

# Technical analysis
curl "http://localhost:3000/api/stock/technicals?symbol=AAPL"
```

See [QUICK_START_PHASE2.md](./.claude/QUICK_START_PHASE2.md) for complete testing guide.

---

## 💰 Pricing & Costs

| Service | Cost | Purpose |
|---------|------|---------|
| Finnhub Free | $0 | News, quotes, symbols |
| Finnhub Premium | $9/mo | P/E, ROE, earnings calendar |
| Gemini API | ~$2.50/1M tokens | AI summaries & analysis |
| TradingView | Free | Chart library |
| Binance API | Free | Crypto prices |

**Estimated Monthly Cost:** $10-15

---

## 🗺️ Roadmap

### Phase 1 ✅
- News aggregation + sentiment
- AI news summarization
- Live price tracking
- Market ticker

### Phase 2 ⚒️
- Stock fundamental analysis
- Technical indicators
- AI recommendations
- Earnings calendar

### Phase 3 (Planned)
- Portfolio tracking + PnL
- Price alerts (email, web, mobile)
- Advanced analytics (correlation, heatmap)
- Community features (leaderboard, ideas)
- Monetization (freemium tier system)

---

## 👥 Team

- **Product Owner:** User (Turkish crypto/stock trader)
- **AI Assistant:** Claude (Implementation + optimization)

---

## 📝 License

Private project (AXIOM SaaS)

---

## 🤝 Contributing

Work in progress. Contact team for contributions.

---

## 📞 Support

- Issues: Check `.claude/` documentation
- Questions: Review API specs in `ARCHITECTURE.md`
- Live demo: `http://localhost:3000/dashboard`

---

**Last Updated:** April 17, 2026  
**Status:** Phase 1 ✅ Complete | Phase 2 ⚒️ Foundation Built  
**Live:** http://localhost:3000

---

Built with ❤️ for Turkish traders.
