import { getCoinGeckoData } from './crypto-coingecko';
import { getDevHealthMetrics } from './crypto-github';
import type { WhitepaperData } from './crypto-whitepaper';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface CryptoAnalysisResult {
  overall_score: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: 'high' | 'medium' | 'low';
  executive_summary: string;
  strengths: string[];
  red_flags: string[];
  dev_analysis: string;
  tokenomics_analysis: string;
  short_term_outlook: string;
}

export async function generateCryptoAnalysis(
  symbol: string,
  devMetrics: Awaited<ReturnType<typeof getDevHealthMetrics>>,
  tokenomics: Awaited<ReturnType<typeof getCoinGeckoData>>
): Promise<CryptoAnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const prompt = buildPrompt(symbol, devMetrics, tokenomics);

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[crypto-gemini] Gemini API error:', err);
    return null;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    return JSON.parse(text) as CryptoAnalysisResult;
  } catch {
    console.error('[crypto-gemini] JSON parse failed:', text.slice(0, 200));
    return null;
  }
}

function buildPrompt(
  symbol: string,
  dev: Awaited<ReturnType<typeof getDevHealthMetrics>>,
  tok: Awaited<ReturnType<typeof getCoinGeckoData>>
): string {
  const devSection = dev
    ? `
Developer Health:
- Commits (last 30d): ${dev.commits_30d}
- Active developers: ${dev.active_developers}
- Recent PRs (closed): ${dev.recent_prs}
- Avg PR review time: ${dev.avg_pr_review_time.toFixed(1)} hours`
    : 'Developer Health: No GitHub data available';

  const tokSection = tok
    ? `
Tokenomics:
- Current price: $${tok.current_price}
- Market cap: $${(tok.market_cap / 1e9).toFixed(2)}B
- 24h volume: $${(tok.total_volume / 1e9).toFixed(2)}B
- Circulating supply: ${(tok.circulating_supply / 1e6).toFixed(1)}M
- Total supply: ${tok.total_supply ? (tok.total_supply / 1e6).toFixed(1) + 'M' : 'unlimited'}
- Max supply: ${tok.max_supply ? (tok.max_supply / 1e6).toFixed(1) + 'M' : 'none (inflationary)'}
- Dilution ratio: ${tok.total_supply && tok.circulating_supply ? ((1 - tok.circulating_supply / tok.total_supply) * 100).toFixed(1) + '%' : 'N/A'}
- CoinGecko commits (4w): ${tok.commit_count_4_weeks ?? 'N/A'}`
    : 'Tokenomics: No CoinGecko data available';

  return `You are a professional crypto intelligence analyst. Analyze the following on-chain and development data for ${symbol} and return a structured JSON report.

${devSection}
${tokSection}

Return ONLY valid JSON matching this exact schema:
{
  "overall_score": <integer 0-100>,
  "recommendation": <"STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL">,
  "confidence": <"high" | "medium" | "low">,
  "executive_summary": <2-3 sentence summary of the overall health and investment case>,
  "strengths": [<up to 3 specific data-backed strengths>],
  "red_flags": [<up to 3 specific data-backed red flags, empty array if none>],
  "dev_analysis": <1-2 sentences analyzing developer activity and GitHub health>,
  "tokenomics_analysis": <1-2 sentences analyzing supply, dilution, and market metrics>,
  "short_term_outlook": <1 sentence on near-term price/momentum outlook>
}

Scoring guide:
- overall_score 80-100: Strong fundamentals, low risk
- overall_score 60-79: Solid project, manageable risks
- overall_score 40-59: Mixed signals, caution warranted
- overall_score 0-39: Significant red flags, high risk`;
}

// ── Whitepaper vs Reality ─────────────────────────────────────────────────────

export interface WhitepaperAnalysisResult {
  accountability_score: number;
  verdict: 'DELIVERING' | 'PARTIAL' | 'FALLING_BEHIND' | 'ABANDONED';
  promises_kept: string[];
  promises_broken: string[];
  reality_check: string;
  long_term_outlook: string;
}

export async function generateWhitepaperAnalysis(
  symbol: string,
  whitepaper: WhitepaperData,
  devMetrics: Awaited<ReturnType<typeof getDevHealthMetrics>>,
  tokenomics: Awaited<ReturnType<typeof getCoinGeckoData>>
): Promise<WhitepaperAnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const devSummary = devMetrics
    ? `commits_30d=${devMetrics.commits_30d}, active_developers=${devMetrics.active_developers}, recent_prs=${devMetrics.recent_prs}`
    : 'no GitHub data';

  const tokSummary = tokenomics
    ? `price=$${tokenomics.current_price}, market_cap=$${(tokenomics.market_cap / 1e9).toFixed(2)}B, circulating=${(tokenomics.circulating_supply / 1e6).toFixed(1)}M`
    : 'no tokenomics data';

  const prompt = `You are a blockchain accountability analyst. Compare what ${whitepaper.project_name} (${symbol}) originally promised with what their on-chain and development data shows today.

Project description / original vision:
"""
${whitepaper.description.slice(0, 1500)}
"""

Current reality (live data):
- Developer activity: ${devSummary}
- Market metrics: ${tokSummary}

Return ONLY valid JSON:
{
  "accountability_score": <integer 0-100, 100 = fully delivering on promises>,
  "verdict": <"DELIVERING" | "PARTIAL" | "FALLING_BEHIND" | "ABANDONED">,
  "promises_kept": [<up to 3 specific claims the project has delivered on>],
  "promises_broken": [<up to 3 specific claims the project has not delivered on, empty array if none>],
  "reality_check": <2-3 sentences comparing the original vision to current state>,
  "long_term_outlook": <1-2 sentences on whether they will eventually deliver>
}

Verdict guide:
- DELIVERING: 70-100, actively shipping, metrics match promises
- PARTIAL: 40-69, some progress but significant gaps remain
- FALLING_BEHIND: 20-39, very slow progress, major promises unmet
- ABANDONED: 0-19, no meaningful activity, project appears dead`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    console.error('[crypto-gemini] whitepaper Gemini error:', await response.text());
    return null;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    return JSON.parse(text) as WhitepaperAnalysisResult;
  } catch {
    console.error('[crypto-gemini] whitepaper JSON parse failed:', text.slice(0, 200));
    return null;
  }
}
