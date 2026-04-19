# 🏗️ AXIOM Architecture & Implementation Guide

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Dashboard (3-Column Layout)                            │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ [Market Ticker - Scrolling] (Top)                      │ │
│  ├────────────────┬──────────────┬───────────────────────┤ │
│  │ News List      │ News Detail  │ Favorites/Watchlist   │ │
│  │ • Categories   │ • AI Summary │ • Live Prices         │ │
│  │ • Search       │ • Analysis   │ • Sparklines          │ │
│  │ • Voting       │ • Chart      │ • 24h H/L             │ │
│  │ • Sentiment    │ • Modal      │ • Add/Remove          │ │
│  └────────────────┴──────────────┴───────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                      ↓
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (API)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /api/quote           → Binance + Finnhub bulk prices      │
│  /api/ticker          → Top 20 + Indices + Mag7            │
│  /api/ai/summarize    → Gemini news summary                │
│  /api/analysis/market → Gemini market-aware analysis       │
│  /api/news            → News aggregation (RSS + Finnhub)   │
│  /api/candles         → OHLC data for charts               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓              ↓
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  EXTERNAL APIs   │ │  DATA STORAGE    │ │  AI MODELS       │
├──────────────────┤ ├──────────────────┤ ├──────────────────┤
│ • Binance        │ │ • localStorage   │ │ • Gemini 2.0     │
│ • Finnhub        │ │ • Votes          │ │   Flash          │
│ • TradingView    │ │ • Favorites      │ │                  │
│ • Yahoo Finance  │ │ • Categories     │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Data Flow

### 1. **News Feed Pipeline**

```
News Sources (7 total)
    ↓
[/api/news endpoint]
    ├─ RSSNewsSource (CoinDesk, Cointelegraph, Investing)
    └─ FinnhubNewsSource (Finnhub /news?category=crypto|forex|general)
    ↓
Symbol Extraction (keyword mapping)
    ↓
Dedup by URL
    ↓
Filter by category/search
    ↓
Display in NewsList + Sort by date
    ↓
User selects article
    ↓
[Two parallel processes]
    ├─ /api/ai/summarize (AI Özet)
    └─ /api/analysis/market (Market Analysis with context)
```

### 2. **Price Update Pipeline**

```
User opens dashboard / Adds favorite
    ↓
[Market Ticker Updates (5s interval)]
    ↓
/api/ticker → Binance + Finnhub
    ↓
Top 20 Cryptos | S&P 500 | NASDAQ | Mag7
    ↓
Display scrolling ticker
    
---

[Watchlist Updates (15s interval)]
    ↓
/api/quote → Binance + Finnhub
    ↓
For each favorite symbol
    ├─ Current price
    ├─ 24h change
    ├─ High/Low
    └─ Generate sparkline (5m interval)
    ↓
Display in FavoritesBar
```

### 3. **Analysis Pipeline**

```
User clicks article
    ↓
NewsDetail component
    ├─ Auto-generate AI Summary
    │  ├─ /api/ai/summarize
    │  ├─ Gemini: Önemli noktaları çıkar
    │  └─ Display with loading state
    │
    └─ Auto-generate Market Analysis
       ├─ /api/analysis/market
       ├─ Fetch symbol prices (/api/quote)
       ├─ Get community sentiment (votes)
       ├─ Gemini: Piyasa etkisi analizi
       │  ├─ Hangi semboller etkilenecek?
       │  ├─ Kısa vadede beklenen hareket?
       │  ├─ Risk vs Fırsat?
       │  └─ Yatırımcı tavsiyesi?
       └─ Display in orange panel
```

---

## Component Hierarchy

```
NewsTab (Main Container)
├── MarketTicker
│   ├── Ticker Item (repeated, scrolling)
│   │   ├── Symbol name
│   │   ├── Price
│   │   └── % Change
│   └── CSS Animation (marquee)
│
├── NewsList (Left Column)
│   ├── Category Tabs
│   ├── Search Input
│   ├── News Item Button (repeated)
│   │   ├── Time indicator
│   │   ├── Title
│   │   ├── Summary
│   │   ├── Symbol chips
│   │   └── Vote count
│   └── Refresh button
│
├── NewsDetail (Center Column)
│   ├── Header (Title + Metadata)
│   ├── Symbol Snapshots
│   │   └── Clickable Chip (triggers chart)
│   ├── Live Chart (if symbol selected)
│   │   └── PriceChart (embedded TradingView)
│   ├── AI Summary Panel
│   │   ├── Loading state
│   │   └── Summary text
│   ├── AXIOM Analysis Panel
│   │   ├── Loading state
│   │   └─ Market analysis text
│   ├── Button: "📖 Makaleyi Oku"
│   └── Voting Buttons
│       ├── 👍 Bullish
│       ├── 👎 Bearish
│       └── 🚨 Panic
│
├── NewsModal (Popup)
│   ├── Header
│   ├── Content (shows iframe OR summary)
│   │   └── Toggle: "📖 Makale Oku" button
│   ├── Symbols section
│   ├── Market Analysis panel
│   └── Footer buttons
│
└── FavoritesBar (Right Column)
    ├── Header + Add input
    ├── Quote Item (repeated)
    │   ├── Symbol
    │   ├── Price
    │   ├── % Change
    │   ├── Sparkline chart
    │   └── 24h H/L mini bar
    └── Loading state
```

---

## API Specifications

### **GET /api/quote**
```
Query: ?symbols=BINANCE:BTCUSDT,AAPL,BINANCE:ETHUSDT

Response:
{
  quotes: [
    {
      symbol: "BINANCE:BTCUSDT",
      price: 74989.38,
      change: 246,
      changePercent: 0.329,
      high24h: 75534.76,
      low24h: 73309.85,
      source: "binance"
    }
  ]
}

Cache: 5 seconds
```

### **GET /api/ticker**
```
Response:
{
  tickers: [
    { symbol, price, changePercent, name, type: 'crypto'|'index'|'stock' }
  ],
  count: 29,
  timestamp: 1776427707428
}

Order: Cryptos | Indices | Stocks
Cache: 5 seconds
```

### **POST /api/ai/summarize**
```
Body:
{
  title: "Bitcoin düştü",
  summary: "...",
  locale: "tr" | "en"
}

Response:
{
  summary: "Bitcoin'in fiyat düşüşü... [Gemini çıktısı]",
  success: true
}

Model: gemini-2.0-flash
Max tokens: 300
```

### **POST /api/analysis/market**
```
Body:
{
  newsId: "abc123",
  title: "...",
  summary: "...",
  symbols: ["BINANCE:BTCUSDT", "AAPL"],
  bullish: 45,
  bearish: 12,
  panic: 5,
  locale: "tr"
}

Response:
{
  analysis: "Bu haberden etkilenecek sektörler... [Gemini çıktısı]",
  prices: [{ symbol, price, change24h, changePercent }],
  sentiment: { bullish, bearish, panic },
  success: true
}

Model: gemini-2.0-flash
Max tokens: 500
Includes: Price context + Sentiment
```

---

## Key Technologies & Integration Points

### **1. Chart Integration (TradingView)**
```typescript
// src/components/charts/PriceChart.tsx
- Embedded mode for NewsDetail
- 1h/4h/1d/1w resolutions
- Candlestick + Volume
- Technical indicators (RSI, SMA, EMA, MACD)
- Y-axis pan/zoom with mouse + wheel
- Custom pointer events for smooth interaction
```

### **2. AI Integration (Gemini 2.0 Flash)**
```
Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
Auth: process.env.GEMINI_API_KEY
Temperature: 0.7
Max tokens: 300-500
Supports: Turkish + English prompts
```

### **3. Price Data Sources**

| Source | Type | Symbols | Cache |
|--------|------|---------|-------|
| Binance | Crypto | BTCUSDT, ETHUSDT, ... | 5s |
| Finnhub | Stocks | AAPL, TSLA, MSFT, ... | 5s |
| Finnhub | Indices | ^GSPC (S&P 500), ^IXIC (NASDAQ) | 5s |
| Finnhub | Forex | EUR_USD, GBP_USD, ... | 5s |

### **4. News Sources (7 total)**

| Source | Type | Category | Method |
|--------|------|----------|--------|
| CoinDesk | RSS | Crypto | RSS |
| Cointelegraph | RSS | Crypto | RSS |
| Investing.com | RSS | General | RSS |
| Yahoo Finance | Finnhub | Stocks | API |
| Finnhub (Crypto) | API | Crypto | /news?category=crypto |
| Finnhub (Forex) | API | Forex | /news?category=forex |
| Finnhub (General) | API | Economy | /news?category=general |

---

## State Management

### **Client-side (localStorage)**
```typescript
// news-storage.ts
- axiom_news_votes: { [newsId]: { bullish, bearish, panic, userVote } }
- axiom_favorites: string[] (symbols)
- axiom_last_category: NewsCategoryFilter
```

### **Server-side (Next.js API)**
```typescript
// Cache with revalidate
- /api/quote: revalidate 5s
- /api/ticker: revalidate 5s
- /api/news: revalidate 60s
- /api/candles: revalidate 10s
- /api/ai/*: No cache (real-time generation)
```

---

## Performance Optimization

| Strategy | Implementation |
|----------|-----------------|
| **Code Splitting** | Dynamic imports for modals |
| **Lazy Loading** | Images with onError handler |
| **Image Optimization** | Next.js Image component (when applicable) |
| **Caching** | 5-60s API caching + localStorage |
| **Debouncing** | Search input (500ms) |
| **Memoization** | useMemo for filtered lists |
| **CSS Animation** | GPU-accelerated ticker scroll |

---

## Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key
GEMINI_API_KEY=your_gemini_key

# Optional
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## File Size & Metrics

| Metric | Value |
|--------|-------|
| **Bundle Size** | ~2.4 MB (unminified) |
| **API Endpoints** | 6 total |
| **Components** | 8 main |
| **Lines of Code** | ~5000+ |
| **TypeScript Coverage** | ~95% |

---

## Testing Checklist

- [ ] Market ticker scrolls continuously
- [ ] Prices update every 5 seconds
- [ ] Clicking symbol chip loads chart
- [ ] AI summary auto-generates on article select
- [ ] Market analysis includes price + sentiment context
- [ ] Voting persists after refresh
- [ ] Favorites add/remove works
- [ ] Search filters articles correctly
- [ ] Category filters work
- [ ] Responsive on mobile (stacked layout)

---

**Last Updated:** 2026-04-18
**Version:** Phase 1
**Next Review:** Phase 2 Stock Analysis
