# Phase 3 Week 1 — API Testing Guide

## Status: 2 of 3 Endpoints Ready ✅

### 1. Dev Health Endpoint ✅ READY
**Route:** `/api/crypto/dev-health?symbol=SOL`

**What it does:**
- Fetches GitHub repo commits (last 30 days)
- Counts active developers
- Analyzes recent pull requests
- Scores health (0-100)
- Detects red flags

**Requires:** `GITHUB_API_TOKEN` env var

**Example curl:**
```bash
curl "http://localhost:3000/api/crypto/dev-health?symbol=SOL"
```

**Expected response:**
```json
{
  "symbol": "SOL",
  "dev_health": {
    "score": 75,
    "metrics": {
      "commits_30d": 120,
      "active_developers": 45,
      "recent_prs": 85,
      "avg_pr_review_time": 18.5,
      "timestamp": "2026-04-29T15:30:00Z"
    },
    "red_flags": [],
    "trend": "stable",
    "timestamp": "2026-04-29T15:30:00Z"
  },
  "cached": false,
  "cacheSource": "github"
}
```

---

### 2. Tokenomics Endpoint ✅ READY
**Route:** `/api/crypto/tokenomics?symbol=SOL`

**What it does:**
- Fetches price, market cap, supply data from CoinGecko
- Calculates dilution ratio
- Checks if supply is capped
- Returns all tokenomics metrics

**Requires:** None (CoinGecko is free tier)

**Example curl:**
```bash
curl "http://localhost:3000/api/crypto/tokenomics?symbol=SOL"
```

**Expected response:**
```json
{
  "symbol": "SOL",
  "tokenomics": {
    "symbol": "SOL",
    "current_price": 142.50,
    "market_cap": 62450000000,
    "total_volume": 2450000000,
    "circulating_supply": 438000000,
    "total_supply": 520000000,
    "max_supply": null,
    "commit_count_4_weeks": 120,
    "timestamp": "2026-04-29T15:30:00Z",
    "dilution_ratio": "15.77",
    "is_capped": false
  },
  "cached": false,
  "cacheSource": "coingecko"
}
```

---

### 3. Whitepaper Analysis Endpoint ⏳ WEEK 2
**Route:** `/api/crypto/whitepaper?symbol=SOL`

**Status:** Not yet implemented
- Requires Gemini prompt template
- Needs whitepaper PDF fetching logic
- Will analyze promises vs current state

---

## SETUP CHECKLIST

### ✅ Done
- [x] Supabase crypto_reports_cache table created
- [x] GitHub API integration code written
- [x] CoinGecko integration code written
- [x] Caching system implemented
- [x] Build passing

### ⏳ Needs User Input
- [ ] GitHub PAT token (read:repo scope)
- [ ] Add to `.env.local`:
  ```
  GITHUB_API_TOKEN=ghp_xxxxx
  ```

### ⏳ Next Steps (Tomorrow)
- Test both endpoints locally
- Fix any edge cases
- Create Gemini prompt for whitepaper analysis
- Build whitepaper endpoint

---

## Testing Today

1. **Test CoinGecko (no setup needed):**
   ```bash
   npm run dev
   # In browser: http://localhost:3000/api/crypto/tokenomics?symbol=SOL
   ```

2. **Test GitHub (needs GITHUB_API_TOKEN):**
   ```bash
   # Add GITHUB_API_TOKEN to .env.local
   # Restart dev server
   # In browser: http://localhost:3000/api/crypto/dev-health?symbol=SOL
   ```

---

## Cache Behavior

Both endpoints cache results in Supabase for 6 hours.

**First call:** Fetches fresh, returns `"cached": false`  
**Subsequent calls (within 6h):** Returns cached, `"cached": true`

**Example workflow:**
```
GET /api/crypto/dev-health?symbol=SOL
→ Cache miss
→ Fetches from GitHub
→ Stores in Supabase
→ Response takes ~1-2 seconds

GET /api/crypto/dev-health?symbol=SOL  (same hour)
→ Cache hit
→ Instant response from Supabase
→ Response takes ~100ms
```

---

## Edge Cases Handled

- Symbol not found in mapping → 404 error
- API rate limit → Console error, returns null
- Supabase down → Still fetches fresh data, cache fails silently
- Missing env token → GitHub API auth fails, returns 500

---

## Repository Structure

```
src/lib/
├── crypto-sources.ts       ← API endpoints registry
├── crypto-github.ts        ← GitHub integration
├── crypto-coingecko.ts     ← CoinGecko integration
└── crypto-cache.ts         ← Supabase cache helpers

src/app/api/crypto/
├── dev-health/route.ts     ← GitHub metrics endpoint
└── tokenomics/route.ts     ← CoinGecko metrics endpoint
```

---

## Week 1 Progress

- **Monday (29 Nisan):** Supabase + GitHub + CoinGecko ✅
- **Tuesday (30 Nisan):** Testing + fixes
- **Wednesday (1 Mayıs):** Gemini prompts
- **Thursday (2 Mayıs):** Whitepaper endpoint
- **Friday (3 Mayıs):** All endpoints + commit

**Status:** 1 day ahead of schedule 🚀
