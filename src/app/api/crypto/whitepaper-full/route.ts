import { NextRequest, NextResponse } from 'next/server';
import { getCoinGeckoData } from '@/lib/crypto-coingecko';
import { getCachedCryptoReport, setCachedCryptoReport } from '@/lib/crypto-cache';
import { fetchWhitepaperContent } from '@/lib/crypto-whitepaper';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase();
  const force  = request.nextUrl.searchParams.get('force') === '1';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol gerekli' }, { status: 400 });
  }

  if (!force) {
    const cached = await getCachedCryptoReport('wp_full_v2', symbol);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY eksik' }, { status: 500 });

  // CoinGecko'dan coin bilgisi + whitepaper içeriği paralel çek
  const [coin, rawContent] = await Promise.all([
    getCoinGeckoData(symbol).catch(() => null),
    fetchWhitepaperContent(symbol, null, 8000).catch(() => null),
  ]);

  const coinDesc = coin?.description ?? '';
  const coinName = coin?.name ?? symbol;

  // Eğer ham içerik varsa prompt'a ekle, yoksa Gemini kendi bilgisini kullanır
  const sourceBlock = rawContent && rawContent.length > 200
    ? `\n── DÖKÜMANTASYON İÇERİĞİ (kaynak siteden çekildi) ──────────────────────────\n${rawContent}`
    : coinDesc.length > 100
    ? `\n── PROJENİN RESMİ AÇIKLAMASI (CoinGecko) ──────────────────────────────────\n${coinDesc}`
    : '';

  const prompt = `Sen ${coinName} (${symbol}) projesinin whitepaper'ını Türk yatırımcılar için kapsamlı biçimde açıklayacaksın.

${sourceBlock ? `Aşağıdaki kaynak metni referans al, ancak yalnızca indeks/içindekiler tablosu veya anlamsız teknik kodlar içeriyorsa o kısmı ATLA, kendi bilginle doldur:${sourceBlock}` : `${symbol} hakkındaki eğitim verilerini ve bilgini kullan — whitepaper içeriği çekilemedi.`}

── GÖREV ───────────────────────────────────────────────────────────────────
Aşağıdaki formatta Türkçe, akıcı, bilgilendirici bir whitepaper özeti yaz.
Hiç kripto bilgisi olmayan ama yatırım yapmak isteyen birine anlatır gibi yaz.
İndex, referans listesi, sayfa numaraları gibi anlamsız içerikleri çıkar.
Teknik terimleri parantez içinde kısa Türkçe açıklamalarla destekle.
⚡ işaretini yatırımcı için kritik noktaları vurgulamak için kullan.

## 1. Projenin Amacı ve Doğuş Hikayesi
[Neden yaratıldı? Hangi problemi çözmek istedi? Kurucular kimlerdi? Anekdot tarzında, 4-6 cümle]

## 2. Çözdüğü Problem
[Gerçek dünyada hangi sorunu çözüyor? Somut örneklerle, 4-5 cümle]

## 3. Nasıl Çalışır?
[Teknik ama sade anlatım. "Banka gibi ama..." tarzında benzetmeler kullan. 5-7 cümle]

## 4. Token'ın Rolü
[Bu token sadece yatırım aracı mı yoksa sistemin işleyişinde kritik bir rolü var mı? Kullanım alanları. 4-5 cümle]

## 5. Güçlü Rakiplere Göre Farkı
[Neden bu coin, rakibi değil? Ana avantajlar. 3-4 cümle]

## 6. Yatırımcının Bilmesi Gerekenler
⚡ [En kritik 4-5 madde. Risk ve fırsatlar. Kısa ve öz bullet points tarzında]

Her bölümü gerçekten doldurun. Kısa geçiştirmeyin. Toplam ~600-800 kelime olsun.`;

  const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4000,
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
    rawLength: rawContent?.length ?? 0,
    generatedAt: Date.now(),
    cached: false,
  };

  await setCachedCryptoReport('wp_full_v2', symbol, result);
  return NextResponse.json(result);
}
