import { NextRequest, NextResponse } from 'next/server';
import { getDevHealthMetrics } from '@/lib/crypto-github';
import { getCoinGeckoData } from '@/lib/crypto-coingecko';
import { getProjectDescription } from '@/lib/crypto-whitepaper';
import { getFearGreedIndex } from '@/lib/crypto-fear-greed';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol');
  const force   = request.nextUrl.searchParams.get('force') === '1';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
  }

  if (!force) {
    const cached = await getCachedCryptoReport('full_report', symbol);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  // ── Tüm veri kaynaklarını paralel çek ─────────────────────────────────────
  const [devMetrics, tokenomics, projectInfo, fearGreed] = await Promise.all([
    getDevHealthMetrics(symbol).catch(() => null),
    getCoinGeckoData(symbol).catch(() => null),
    getProjectDescription(symbol).catch(() => null),
    getFearGreedIndex().catch(() => null),
  ]);

  // ── Gemini prompt: 6-Perde Türkçe narratif ──────────────────────────────
  const prompt = buildPrompt(symbol, devMetrics, tokenomics, projectInfo, fearGreed);

  const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!geminiRes.ok) {
    console.error('[crypto/report] Gemini error:', await geminiRes.text());
    return NextResponse.json({ error: 'Rapor üretilemedi' }, { status: 500 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return NextResponse.json({ error: 'Gemini boş döndü' }, { status: 500 });

  let report: any;
  try {
    // Strip possible markdown code fence wrapping
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    report = JSON.parse(cleaned);
  } catch {
    // Fallback: try to extract JSON object with regex
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { report = JSON.parse(match[0]); }
      catch { /* fall through */ }
    }
    if (!report) {
      console.error('[crypto/report] JSON parse failed. Length:', raw.length, '| Last 200:', raw.slice(-200));
      return NextResponse.json({ error: 'Rapor ayrıştırılamadı' }, { status: 500 });
    }
  }

  const result = {
    symbol,
    projectName: projectInfo?.project_name ?? symbol,
    recommendation: report.verdict as 'AL' | 'SAT' | 'BEKLE',
    confidenceScore: report.confidence_score as number,
    keyInsight: report.key_insight as string,
    fullReport: report.full_report as string,
    chips: {
      devScore:   devMetrics   ? calcDevScore(devMetrics)         : null,
      fearGreed:  fearGreed    ? fearGreed.value                  : null,
      fearLabel:  fearGreed    ? fearGreed.label                  : null,
      dilution:   tokenomics   ? parseFloat(String(
        tokenomics.total_supply && tokenomics.circulating_supply
          ? ((1 - tokenomics.circulating_supply / tokenomics.total_supply) * 100).toFixed(1)
          : '0'
      )) : null,
      price:      tokenomics   ? tokenomics.current_price         : null,
      marketCap:  tokenomics   ? tokenomics.market_cap            : null,
    },
    generatedAt: Date.now(),
    cached: false,
  };

  await setCachedCryptoReport('full_report', symbol, result);
  return NextResponse.json(result);
}

function calcDevScore(dev: any): number {
  let score = 50;
  score += Math.min(dev.commits_30d / 5, 30);
  score += Math.min(dev.active_developers / 2, 20);
  score += Math.min(dev.recent_prs / 3, 15);
  if (dev.avg_pr_review_time < 24) score += 10;
  else if (dev.avg_pr_review_time < 72) score += 5;
  return Math.min(Math.round(score), 100);
}

function fmt(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

function buildPrompt(symbol: string, dev: any, tok: any, proj: any, fg: any): string {
  const devBlock = dev
    ? `GitHub (son 30 gün): ${dev.commits_30d} commit, ${dev.active_developers} aktif geliştirici, ${dev.recent_prs} PR kapatıldı, ortalama PR inceleme süresi ${dev.avg_pr_review_time.toFixed(0)} saat`
    : 'GitHub verisi mevcut değil';

  const tokBlock = tok
    ? `Fiyat: $${tok.current_price} | Market Cap: $${fmt(tok.market_cap)} | 24s Hacim: $${fmt(tok.total_volume)} | Dolaşımdaki arz: ${fmt(tok.circulating_supply)} | Toplam arz: ${tok.total_supply ? fmt(tok.total_supply) : 'sınırsız'} | Max arz: ${tok.max_supply ? fmt(tok.max_supply) : 'yok (enflasyonist)'}`
    : 'Tokenomics verisi mevcut değil';

  const fgBlock = fg
    ? `Korku & Açgözlülük Endeksi: ${fg.value}/100 (${fg.label})`
    : 'Korku & Açgözlülük verisi mevcut değil';

  const projBlock = proj?.description
    ? `Proje tanımı: "${proj.description.slice(0, 600)}"`
    : 'Proje açıklaması mevcut değil';

  return `Sen AXIOM platformunun kıdemli kripto analistisin. Türk yatırımcılar için ${symbol} hakkında kapsamlı bir istihbarat raporu yaz.

Mevcut veriler:
${devBlock}
${tokBlock}
${fgBlock}
${projBlock}

6-PERDE yapısında Türkçe rapor yaz. Her perde başlık ile başlasın. Toplam 400-500 kelime.

Her perde için 2-3 cümle yaz. Toplam 250-300 kelime. Kısa ve net ol.

## PERDE 1 — KAHRAMAN
Piyasa sentiment ve akıllı para analizi.

## PERDE 2 — ÇATIŞMA
Developer sağlığı ve token arz riskleri.

## PERDE 3 — KANIT
Sayısal verilerle güçlü/zayıf karşılaştırması.

## PERDE 4 — HARİTA
Kısa vadeli beklentiler, adoption sinyalleri.

## PERDE 5 — İKİNCİ FİKİR
Proje vaatleri ile gerçek veriler arasındaki fark.

## PERDE 6 — SONUÇ
Net karar ve güven skoru.

Sadece şu JSON formatını döndür (full_report içinde \\n kullan satır sonu için):
{
  "verdict": "AL" | "SAT" | "BEKLE",
  "confidence_score": <1-10 arası tam sayı>,
  "key_insight": "<tek cümle, en kritik bulgu>",
  "full_report": "<6 perdeli Türkçe metin, ## başlıkları ile>"
}`;
}
