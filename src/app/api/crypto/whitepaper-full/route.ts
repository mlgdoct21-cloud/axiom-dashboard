import { NextRequest, NextResponse } from 'next/server';
import { getCoinGeckoData } from '@/lib/crypto-coingecko';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';
import { fetchWhitepaperContent } from '@/lib/crypto-whitepaper';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase();
  const force  = request.nextUrl.searchParams.get('force') === '1';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol gerekli' }, { status: 400 });
  }

  if (!force) {
    const cached = await getCachedCryptoReport('wp_full_v1', symbol);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY eksik' }, { status: 500 });

  // CoinGecko'dan whitepaper URL al
  let whitepaperUrl: string | null = null;
  try {
    const coin = await getCoinGeckoData(symbol);
    whitepaperUrl = coin?.whitepaper_url ?? null;
  } catch {
    // URL olmadan da devam et
  }

  // Whitepaper içeriğini çek (limit artırıldı)
  const rawContent = await fetchWhitepaperContent(symbol, whitepaperUrl, 12000);

  if (!rawContent) {
    return NextResponse.json(
      { error: `${symbol} için whitepaper içeriği bulunamadı` },
      { status: 404 }
    );
  }

  // Gemini ile tam Türkçe çeviri
  const prompt = `Aşağıdaki kripto para whitepaper/dökümantasyon metni ${symbol} projesine aittir.

Bu metni Türk yatırımcılar ve kripto meraklıları için aşağıdaki kurallara göre işle:

1. Metni bölümlere ayır, her bölüme Türkçe başlık ver
2. Teknik terimleri parantez içinde kısa Türkçe açıklamalarla destekle
3. Akademik/teknik cümleleri sade Türkçeye çevir, anlam kaybetmeden
4. Önemli rakamları, tarihleri, proje isimlerini koru
5. Yatırımcı açısından kritik noktaları ⚡ işaretiyle öne çıkar
6. Tüm çıktı Türkçe olmalı

Whitepaper içeriği:
---
${rawContent}
---

Şimdi yukarıdaki içeriği işle. Başlıklı bölümler halinde, akıcı Türkçe ile yaz.`;

  const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 6000,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!geminiRes.ok) {
    console.error('[whitepaper-full] Gemini error:', await geminiRes.text());
    return NextResponse.json({ error: 'Çeviri üretilemedi' }, { status: 500 });
  }

  const geminiData = await geminiRes.json();
  const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!content) {
    return NextResponse.json({ error: 'Gemini boş yanıt döndü' }, { status: 500 });
  }

  const result = {
    symbol,
    content,
    rawLength: rawContent.length,
    generatedAt: Date.now(),
    cached: false,
  };

  // 24 saatlik cache — override ile 6 saatlik default'u bypass et
  await setCachedCryptoReport('wp_full_v1', symbol, result);

  return NextResponse.json(result);
}
