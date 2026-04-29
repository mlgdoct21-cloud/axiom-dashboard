import { NextRequest, NextResponse } from 'next/server';
import { getCoinGeckoData } from '@/lib/crypto-coingecko';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';
import { getOnChainHolders } from '@/lib/crypto-whales';
import { getGitHubReleases } from '@/lib/crypto-roadmap';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function fmtNum(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase();
  const force  = request.nextUrl.searchParams.get('force') === '1';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol gerekli' }, { status: 400 });
  }

  if (!force) {
    const cached = await getCachedCryptoReport('overview_v3', symbol);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY eksik' }, { status: 500 });

  // ── Paralel veri çekimi ────────────────────────────────────────────────────
  const [coin, onChainHolders, releases] = await Promise.all([
    getCoinGeckoData(symbol),
    getOnChainHolders(symbol),
    getGitHubReleases(symbol),
  ]);

  if (!coin) {
    return NextResponse.json({ error: `${symbol} için veri bulunamadı` }, { status: 404 });
  }

  const circulatingPct = coin.total_supply
    ? Math.round((coin.circulating_supply / coin.total_supply) * 100)
    : 100;

  // ── Gemini prompt ──────────────────────────────────────────────────────────
  // Whitepaper section: Gemini uses its own training knowledge + CoinGecko description
  const prompt = buildPrompt(symbol, coin, circulatingPct, onChainHolders, releases, null);

  const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
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

  if (!geminiRes.ok) {
    console.error('[crypto/overview] Gemini error:', await geminiRes.text());
    return NextResponse.json({ error: 'Analiz üretilemedi' }, { status: 500 });
  }

  const geminiData = await geminiRes.json();
  const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let analysis: any;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    analysis = JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { analysis = JSON.parse(match[0]); } catch { /* ignore */ } }
    if (!analysis) {
      console.error('[crypto/overview] JSON parse failed, raw length:', raw.length);
      return NextResponse.json({ error: 'Analiz ayrıştırılamadı' }, { status: 500 });
    }
  }

  const result = {
    symbol,
    name: coin.name,
    price: {
      current:       coin.current_price,
      change24h:     coin.price_change_24h,
      change7d:      coin.price_change_7d,
      marketCap:     coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      volume24h:     coin.total_volume,
      ath:           coin.ath,
      athChangePct:  coin.ath_change_percentage,
    },
    supply: {
      circulating:    coin.circulating_supply,
      total:          coin.total_supply,
      max:            coin.max_supply,
      circulatingPct,
      lockedPct: 100 - circulatingPct,
    },
    verdict:        analysis.verdict        as 'AL' | 'SAT' | 'BEKLE',
    confidence:     analysis.confidence     as number,
    keyInsight:     analysis.key_insight    as string,
    tokenomics:     analysis.tokenomics,
    whitepaper:     analysis.whitepaper,
    roadmap:        analysis.roadmap,
    whales:         analysis.whales,
    // pass through on-chain data separately
    onChainHolders: onChainHolders ?? [],
    generatedAt: Date.now(),
    cached: false,
  };

  await setCachedCryptoReport('overview_v3', symbol, result);
  return NextResponse.json(result);
}

function buildPrompt(
  symbol: string,
  coin: any,
  circulatingPct: number,
  onChainHolders: any[] | null,
  releases: any[],
  whitepaperText: string | null,
): string {

  const whitepaperBlock = whitepaperText
    ? `\n── GERÇEK WHİTEPAPER İÇERİĞİ (${coin.whitepaper_url ?? 'çekildi'}) ────────────────────────────\n${whitepaperText}\n(Yukarıdaki metin projenin resmi whitepaper/dökümantasyonundan alınmıştır. Whitepaper bölümünü buna dayanarak yaz.)`
    : '\n(Whitepaper URL\'i yok veya çekilemedi — CoinGecko açıklamasına ve genel bilgine dayan.)';

  const holdersBlock = onChainHolders?.length
    ? `\nGerçek on-chain top holder adresleri (Ethplorer):\n` +
      onChainHolders.slice(0, 12).map((h: any, i: number) =>
        `  ${i+1}. ${h.address} — %${h.share} arz | Etiket: ${h.label ?? 'bilinmiyor'} | Tür: ${h.type}`
      ).join('\n')
    : '\nOn-chain holder verisi yok (SOL/BTC/ADA için chain explorer gerekiyor).';

  const releasesBlock = releases.length
    ? `\nGitHub release geçmişi (son ${releases.length} versiyon):\n` +
      releases.slice(0, 12).map(r =>
        `  [${r.date}] ${r.tag} — ${r.name}`
      ).join('\n')
    : '\nGitHub release verisi yok.';

  return `Sen AXIOM platformunun kripto analisti olarak Türk yatırımcılara ${symbol} (${coin.name}) hakkında derin ve kapsamlı bir rapor hazırlıyorsun. Türk yatırımcıların büyük çoğunluğu teknik detay bilmiyor, whitepaper okumamış, on-chain veri görmemiş. Senin görevin tüm bu karmaşık bilgiyi sade, anlaşılır Türkçeye çevirmek.

── GERÇEK ZAMANLI VERİLER (CoinGecko) ─────────────────────────────────────
Coin: ${coin.name} (${symbol})
Fiyat: $${coin.current_price?.toLocaleString()}
24s Değişim: ${coin.price_change_24h?.toFixed(2)}%
7g Değişim: ${coin.price_change_7d?.toFixed(2)}%
Piyasa Değeri: $${coin.market_cap ? fmtNum(coin.market_cap) : 'bilinmiyor'}
Sıralama: #${coin.market_cap_rank}
Dolaşımdaki arz: ${coin.circulating_supply ? fmtNum(coin.circulating_supply) : '?'} (%${circulatingPct})
Toplam arz: ${coin.total_supply ? fmtNum(coin.total_supply) : 'sınırsız/enflasyonist'}
Max arz: ${coin.max_supply ? fmtNum(coin.max_supply) : 'yok'}
ATH: $${coin.ath?.toLocaleString()} (şu an %${Math.abs(coin.ath_change_percentage ?? 0).toFixed(0)} aşağıda)
Kategoriler: ${coin.categories?.slice(0, 5).join(', ') ?? ''}
${holdersBlock}
${releasesBlock}

── PROJE AÇIKLAMASI (CoinGecko) ─────────────────────────────────────────────
${coin.description?.slice(0, 1500) ?? 'Açıklama yok'}
${whitepaperBlock}

── GÖREV ─────────────────────────────────────────────────────────────────────
Aşağıdaki JSON'u TÜRKÇE ve DETAYLI olarak üret. Her bölümü gerçekten doldurun, kısa geçiştirmeyin.

{
  "verdict": "AL" | "SAT" | "BEKLE",
  "confidence": <1-10>,
  "key_insight": "<Tek cümle, en kritik bulgu>",

  "tokenomics": {
    "simple_explanation": "<3-5 cümle. Tokenomics'i HIÇBIR ŞEY bilmeyen birine anlat. Kaç coin var, kaçı piyasada, neden önemli, enflasyonist mi değil mi, staking var mı.>",
    "dilution_risk": "DÜŞÜK" | "ORTA" | "YÜKSEK",
    "dilution_explanation": "<Dilüsyon riskini somut rakamlarla açıkla. Örneğin henüz piyasaya çıkmamış kaç coin var, ne zaman çıkabilir, bunun fiyata etkisi ne olabilir.>",
    "supply_note": "<Max arz yoksa neden önemli olduğunu açıkla. Varsa halving gibi mekanizmaları açıkla.>"
  },

  "whitepaper": {
    "purpose": "<Bu coin neden yaratıldı? Kurucu(lar) hangi problemi çözmek istedi? Gerçek dünyada ne değiştirmeyi hayal ediyordu? 3-5 cümle, anekdot tarzında anlat.>",
    "problem_solved": "<Somut olarak hangi problemi çözüyor? Teknik ama basit dilde. Örnek ver. 3-4 cümle.>",
    "how_it_works": "<Nasıl çalışıyor? Kullanıcı açısından ve teknik açıdan basitçe. 'Banka hesabı gibi ama...' tarzında benzetmeler kullan. 4-5 cümle.>",
    "token_role": "<Bu tokenin ekosistemde ne işe yaradığı. Sadece yatırım aracı mı yoksa gerçekten kullanılıyor mu? Staking, governance, gas fee gibi kullanım alanları. 3-4 cümle.>",
    "vs_competitors": "<En güçlü rakiplerine göre farkı ne? Neden bu coin, rakibi değil? 2-3 cümle.>",
    "key_risks": "<Projenin zayıf noktaları veya tehditler. Dürüst ol. 2-3 madde liste olarak.>"
  },

  "roadmap": {
    "summary": "<Projenin genel gelişim hikayesini 3-4 cümleyle anlat. Nerede başladılar, nereye geldiler, nereye gidiyorlar.>",
    "milestones": [
      {
        "period": "<Ay-Yıl veya Çeyrek, örn: 'Ocak 2024' veya 'Q2 2025'>",
        "title": "<Kısa başlık, örn: 'Mainnet Lansmanı' veya 'Ethereum Merge'>",
        "description": "<Ne oldu veya ne planlanıyor? 1-2 cümle. Basit dil.>",
        "status": "TAMAMLANDI" | "DEVAM_EDIYOR" | "PLANLANMIYOR" | "GELECEK",
        "impact": "DÜŞÜK" | "ORTA" | "YÜKSEK"
      }
    ],
    "next_major": "<Önümüzdeki en önemli gelişme nedir? Tarih varsa belirt. 1-2 cümle.>"
  },

  "whales": {
    "summary": "<Büyük oyuncuların bu coindeki durumunu 3-4 cümleyle anlat. Kimler tutuyor, niçin önemli, akıllı para giriyor mu çıkıyor mu?>",
    "signal": "ALIYOR" | "SATIYOR" | "NOTR" | "BILINMIYOR",
    "labeled_holders": [
      {
        "address": "<adres veya 'bilinmiyor'>",
        "label": "<İsim, örn: 'Binance', 'Arbitrum Foundation', 'Polychain Capital'>",
        "type": "BORSA" | "VC_FONU" | "KURUM" | "VAKIF" | "EKIP" | "BILINMIYOR",
        "share_pct": <sayı veya null>,
        "note": "<Bu holderla ilgili önemli 1 cümle bilgi. Uzun vadeli mi tutuyor? Satıyor mu? Neden önemli?>"
      }
    ],
    "unlock_risk": "DÜŞÜK" | "ORTA" | "YÜKSEK",
    "unlock_summary": "<Yaklaşan önemli kilit açılımları varsa anlat. Yoksa genel token dağılımını açıkla. 2-3 cümle.>"
  }
}

NOTLAR:
- labeled_holders listesinde on-chain verisi varsa O ADRESLERİ kullan, yoksa bilinen büyük holderları yaz
- roadmap milestones listesinde en az 8-10 önemli milestone ver (geçmiş + gelecek)
- Tüm yazılar TÜRKÇE olacak, teknik jargon olursa parantez içinde açıkla
- Her alan için gerçekten dolu ve bilgilendirici içerik yaz, kısa geçiştirme`;
}
