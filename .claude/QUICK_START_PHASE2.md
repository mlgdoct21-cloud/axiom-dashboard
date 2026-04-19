# Phase 2 Stock Analysis — Quick Start Guide

**Ready to test?** Follow these steps to get stock analysis working.

---

## 🚀 Step 1: Test APIs in Browser

Open browser and try these URLs:

### Search API
```
http://localhost:3000/api/stock/search?q=AAPL
```
Expected: List of Apple-related stocks

### Fundamentals API
```
http://localhost:3000/api/stock/fundamentals?symbol=AAPL
```
Expected: Company name, price, sector, country

### Technicals API
```
http://localhost:3000/api/stock/technicals?symbol=AAPL
```
Expected: RSI, MACD, Bollinger Bands, Moving Averages

### Earnings API (Premium Required)
```
http://localhost:3000/api/stock/earnings?symbol=AAPL
```
Expected: 402 error (Premium tier required)

### Analysis API (POST)
```bash
curl -X POST http://localhost:3000/api/stock/analysis \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "name": "Apple Inc",
    "price": 185.50,
    "sector": "Technology",
    "fundamentals": { "pe": 28.5, "roe": 0.112 },
    "technicals": { "rsi": 62.5, "macdStatus": "bullish" },
    "earnings": { "nextDate": "2026-04-30" },
    "locale": "en"
  }'
```
Expected: BUY/HOLD/SELL recommendation with confidence

---

## 🏗️ Step 2: Integrate into Dashboard

### Option A: Create Stock Tab in NewsTab
Edit `/src/components/tabs/NewsTab.tsx`:

```tsx
import StockPage from '@/components/stocks/StockPage';

const TABS = [
  { id: 'news', label: 'News', component: NewsTab },
  { id: 'stocks', label: 'Stocks', component: StockPage },  // NEW
];

return (
  <div>
    {/* Tab buttons */}
    {activeTab === 'stocks' && <StockPage locale={locale} />}
  </div>
);
```

### Option B: Create Separate Route
Create `/src/app/[locale]/dashboard/stocks/page.tsx`:

```tsx
'use client';

import StockPage from '@/components/stocks/StockPage';
import { useTranslations } from 'next-intl';

export default function StocksPage() {
  const t = useTranslations();
  const locale = useParams().locale as 'en' | 'tr';

  return (
    <div className="min-h-screen bg-[#0f0f20] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#e0e0e0] mb-8">
          {locale === 'tr' ? 'Hisse Analizi' : 'Stock Analysis'}
        </h1>
        <StockPage locale={locale} />
      </div>
    </div>
  );
}
```

---

## 📱 Step 3: Test Components

### Test StockSearch
```tsx
import StockSearch from '@/components/stocks/StockSearch';

export default function TestSearch() {
  return (
    <div className="p-10 bg-[#0f0f20]">
      <StockSearch locale="en" onSelect={(s) => console.log(s)} />
    </div>
  );
}
```

Type "AAPL" → should see results dropdown

### Test StockPage with Symbol
```tsx
<StockPage initialSymbol="AAPL" locale="en" />
```

Should show:
1. Search bar
2. Stock header (Apple Inc)
3. Tab buttons: Fundamentals | Technicals | Analyst
4. Click each tab to see content

---

## ⚙️ Step 4: Upgrade Finnhub (Optional but Recommended)

To enable P/E, ROE, earnings calendar:

1. Go to [finnhub.io/pricing](https://finnhub.io/pricing)
2. Subscribe to Premium ($9/month)
3. Update `.env.local` with new API key (or keep same key)
4. Test `/api/stock/fundamentals?symbol=AAPL` again
5. Should now include: `pe: 28.5`, `roe: 0.112`, etc.

---

## 🧪 Step 5: Test All Components

### FundamentalsTab
- Search for a stock
- Click "Fundamentals" tab
- See company metrics
- Check for "PREMIUM" badges on unavailable data

### TechnicalsTab
- Click "Technicals" tab
- See RSI gauge (0-100)
- Check MACD status
- View Bollinger Bands
- Confirm MA status (bullish/bearish)

### AnalystTab
- Click "Analyst" tab
- Wait for AI analysis (takes 5-10 seconds)
- See BUY/HOLD/SELL recommendation
- Check confidence meter
- Review key strengths + risks

---

## 🐛 Troubleshooting

### API returns 500 error
**Check:**
- Finnhub API key in `.env.local`
- Gemini API key in `.env.local`
- Internet connection

**Fix:**
```bash
# Check .env.local
cat .env.local | grep FINNHUB
cat .env.local | grep GEMINI
```

### Search returns no results
**Check:**
- Symbol is uppercase (e.g., "AAPL" not "aapl")
- Symbol is valid (try MSFT, TSLA, ASELS)

### Fundamentals show "N/A"
- Free tier doesn't include detailed metrics
- Upgrade to Finnhub Premium ($9/mo) to see P/E, ROE, etc.

### AI analysis takes too long
- Gemini API can take 5-10 seconds
- First request slower, then cached
- Check API key is valid

### Technicals show "N/A"
- Ensure symbol has at least 100 days of candle data
- Most US/TR stocks have this
- Avoid very new IPOs

---

## 📊 Test Stocks to Try

**US Stocks:**
- AAPL (Apple)
- MSFT (Microsoft)
- TSLA (Tesla)
- AMZN (Amazon)
- GOOGL (Google)

**Turkish Stocks:**
- ASELS (Arçelik)
- GARAN (Garanti Bank)
- AKBANK (Akbank)
- THYAO (Turkish Airlines)
- TUPRS (TÜPRAŞ)

---

## 🎯 Success Criteria

You'll know Phase 2 is working when:

- ✅ Can search for any US/TR stock
- ✅ See company info + current price
- ✅ View technical indicators (RSI, MACD, etc.)
- ✅ Get AI recommendation (BUY/HOLD/SELL)
- ✅ See confidence score + target price
- ✅ All components are responsive (mobile/tablet/desktop)
- ✅ Turkish + English both work
- ✅ No errors in browser console

---

## 💡 Tips for Users

### Finding Good Recommendations
1. Look for stocks with:
   - Confidence > 70%
   - Low risk rating
   - Multiple bullish technical indicators
   - Positive earnings surprises

### Using the Data
- **Fundamentals:** Long-term investment decision
- **Technicals:** Entry/exit points + momentum
- **Analyst:** AI consensus + target price

### Earnings Impact
- Check "Days Until Earnings"
- Historical surprises show if company tends to beat
- Use AI analysis to predict impact

---

## 📞 Common Questions

**Q: Why doesn't P/E show?**
A: Requires Finnhub Premium. Free tier returns company name + price only.

**Q: Is AI recommendation always accurate?**
A: No, it's based on current data. Use as one of many data points.

**Q: Can I add stocks to watchlist?**
A: Not yet — that's Phase 3. Currently read-only.

**Q: What symbols does it support?**
A: Any stock in Finnhub database (US, Europe, Asia, Turkey).

---

## 🚀 Next: Phase 3 Features

After stock analysis is stable:

1. **Watchlist/Portfolio Tracking**
   - Save favorite stocks
   - Track entry price
   - Calculate gains/losses

2. **Price Alerts**
   - Set alerts (e.g., "BTC > $75k")
   - Web notifications
   - Email notifications

3. **Advanced Charts**
   - Full TradingView integration
   - Custom timeframes
   - Technical drawing tools

---

**Ready to test?** Start with Step 1 — test the APIs!

Last Updated: 2026-04-17
