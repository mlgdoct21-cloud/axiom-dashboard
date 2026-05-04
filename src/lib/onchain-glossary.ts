/**
 * On-Chain Metric Glossary — Türkçe eğitim katmanı.
 *
 * Her metrik için tam isim (TR + EN), 1-2 cümle "nedir", okuma bandı eşikleri,
 * "neden önemli". Tooltip + modal'da kullanılır. CryptoQuant'tan gelen ham
 * sayıyı kullanıcıya hikaye olarak anlatır.
 */

export interface ReadingBand {
  range: string;
  emoji: string;
  label: string;
  meaning: string;
}

export interface MetricInfo {
  short: string;
  full_tr: string;
  full_en: string;
  what_is: string;
  how_to_read: ReadingBand[];
  why_matters: string;
}

export const METRIC_INFO: Record<string, MetricInfo> = {
  // ── Akıllı Para Akışları ──────────────────────────────────────────────────
  exchange_netflow: {
    short: "Borsa Akışı",
    full_tr: "Borsa Net Akışı",
    full_en: "Exchange Netflow",
    what_is: "Borsalara giren BTC miktarı ile çıkan BTC miktarı arasındaki fark. Pozitif = girdi fazla (satış için biriktiriliyor), negatif = çıktı fazla (cüzdanlara çekiliyor).",
    how_to_read: [
      { range: "< -5,000 BTC", emoji: "🟢", label: "Birikim",        meaning: "Coin'ler borsalardan çekiliyor → uzun vadeli tutma niyeti" },
      { range: "-5K → +5K",    emoji: "🟡", label: "Nötr",            meaning: "Olağan akış, sinyal yok" },
      { range: "> +5,000 BTC", emoji: "⚠️", label: "Satış Baskısı",  meaning: "Borsalara coin geliyor → satış hazırlığı" },
    ],
    why_matters: "Fiyat hareketinin en erken uyarı sinyali. Coin'ler borsada satılır; cüzdana çekilen coin satılmaz.",
  },

  whale_ratio: {
    short: "Balina Oranı",
    full_tr: "Borsa Balina Oranı",
    full_en: "Exchange Whale Ratio",
    what_is: "Borsalara gelen en büyük 10 işlemin, toplam girişe oranı. Yüksek değer = büyük cüzdanlar borsalarda aktif.",
    how_to_read: [
      { range: "< 0.70",  emoji: "🟢", label: "Normal",        meaning: "Perakende ağırlıklı akış, balina aktivitesi düşük" },
      { range: "0.70-0.85", emoji: "🟡", label: "İzle",        meaning: "Balina hareketleri artıyor — dikkat" },
      { range: "≥ 0.85",  emoji: "🔴", label: "Balina Aktif", meaning: "Büyük oyuncular borsalarda → volatilite riski yüksek" },
    ],
    why_matters: "Büyük cüzdan sahipleri (whale) piyasayı yönlendirir. Borsalarda aktif olduklarında, sert hareket yakındır.",
  },

  mpi: {
    short: "MPI",
    full_tr: "Madenci Pozisyon Endeksi",
    full_en: "Miner Position Index",
    what_is: "Madencilerin günlük transferlerinin 1 yıllık ortalamasına oranı. Pozitif = madenciler normalden fazla satış yapıyor, negatif = biriktiriyor.",
    how_to_read: [
      { range: "< -0.5", emoji: "🟢", label: "Birikim",         meaning: "Madenciler satmıyor — fiyat artışı bekliyorlar" },
      { range: "-0.5 → 0.5", emoji: "🟢", label: "Madenci Güveni", meaning: "Normal aralık, madenci satış baskısı yok" },
      { range: "0.5 → 2", emoji: "🟡", label: "Hafif Satış",    meaning: "Madenci satışı artıyor, dikkat" },
      { range: "> 2",    emoji: "🔴", label: "Aşırı Satış",    meaning: "Madenciler tarihsel olarak yüksek satışta — fiyat baskısı" },
    ],
    why_matters: "Madenciler piyasanın en büyük sürekli satıcılarıdır. Onlar satmıyorsa, üretim maliyetinin üzerinde fiyat bekliyorlar — bullish onay.",
  },

  stablecoin_inflow: {
    short: "USDT Girişi",
    full_tr: "Stablecoin Borsa Girişi",
    full_en: "Stablecoin Exchange Inflow",
    what_is: "Borsalara giren stablecoin (USDT, USDC, DAI vb.) miktarı. Stablecoin = alım gücü; borsalara geldiğinde kripto satın alınmak içindir.",
    how_to_read: [
      { range: "> $500M",  emoji: "🟢", label: "Alım Gücü Geliyor", meaning: "Yatırımcılar borsalara nakit getiriyor — alım hazırlığı" },
      { range: "$100-500M", emoji: "🟡", label: "Orta Giriş",       meaning: "Normal aralık" },
      { range: "< $100M",  emoji: "🔴", label: "Düşük Giriş",       meaning: "Borsalara para girmiyor — alım iştahı zayıf" },
    ],
    why_matters: "Kripto piyasasının yakıtıdır. Borsalara stablecoin girmiyorsa, fiyatı yukarı itecek alım yok demektir.",
  },

  // ── Döngü Pusulası ────────────────────────────────────────────────────────
  mvrv: {
    short: "MVRV",
    full_tr: "MVRV Oranı",
    full_en: "Market Value to Realized Value Ratio",
    what_is: "Bitcoin'in piyasa değerinin, gerçekleşmiş değere oranı (her coin'in son hareket fiyatına göre). Yatırımcıların ortalama kar/zarar durumunu gösterir.",
    how_to_read: [
      { range: "< 1.0",  emoji: "💎", label: "Tarihsel Dip",   meaning: "Yatırımcılar zararda, panik bölgesi — fırsat" },
      { range: "1.0-1.5", emoji: "🟢", label: "Adil-altı",     meaning: "Makul fiyatın altında — alıcı için iyi giriş" },
      { range: "1.5-2.4", emoji: "🟡", label: "Adil Değer",    meaning: "Tarihsel ortalama, ne ucuz ne pahalı" },
      { range: "2.4-3.7", emoji: "🟡", label: "Aşırı Değerli", meaning: "Tepeye yaklaşıyor — kar realize zamanı" },
      { range: "> 3.7",  emoji: "⚠️", label: "Tarihsel Tepe",  meaning: "Önceki tüm zirvelerle uyumlu — düşüş riski yüksek" },
    ],
    why_matters: "Fiyatın 'ucuz mu pahalı mı' sorusuna matematiksel cevap. Duyguların değil, verinin söylediği değerleme.",
  },

  nupl: {
    short: "NUPL",
    full_tr: "Net Realize Edilmemiş Kar/Zarar",
    full_en: "Net Unrealized Profit/Loss",
    what_is: "Ağdaki tüm yatırımcıların toplam karda mı zararda mı olduğunu yüzde olarak gösteren psikolojik indikatör.",
    how_to_read: [
      { range: "< 0",     emoji: "💎", label: "Kapitülasyon",      meaning: "Çoğunluk zararda — tarihsel dip bölgesi" },
      { range: "0-0.25",  emoji: "🟢", label: "Korku/Umut",        meaning: "Düşük kar, alıcı için sağlıklı bölge" },
      { range: "0.25-0.5", emoji: "🟡", label: "İnanç",            meaning: "Yatırımcılar kar bölgesinde, normal" },
      { range: "0.5-0.75", emoji: "🟡", label: "İyimserlik",       meaning: "Aşırı iyimserliğe yaklaşılıyor" },
      { range: "> 0.75",  emoji: "⚠️", label: "Aşırı Coşku",       meaning: "Tepe psikolojisi — herkes karda, satış riski" },
    ],
    why_matters: "Piyasanın duygusal ısısını ölçer. Aşırı coşku tepelerde, kapitülasyon dipleri belirler — Buffett'in 'başkaları korkarken al' kuralının veriyle ifadesi.",
  },

  sopr: {
    short: "SOPR",
    full_tr: "Harcanan Çıktı Kar Oranı",
    full_en: "Spent Output Profit Ratio",
    what_is: "O gün hareket eden coin'lerin son alındığı fiyat / şu anki fiyat. >1 = karlı satış, <1 = zararına satış.",
    how_to_read: [
      { range: "< 0.98", emoji: "🟢", label: "Zararına Satış (Dip)", meaning: "Yatırımcılar zararına çıkıyor — panik dipte alım fırsatı" },
      { range: "0.98-1.02", emoji: "🟡", label: "Başabaş",          meaning: "Coin'ler maliyet etrafında hareket ediyor" },
      { range: "> 1.02", emoji: "💰", label: "Kar Realizasyonu",   meaning: "Yatırımcılar kar alıyor — sağlıklı yükseliş veya tepe" },
    ],
    why_matters: "Anlık piyasa psikolojisini saatlik yakalar. SOPR<1 dönemleri tarihsel olarak BTC'nin en iyi alım fırsatları.",
  },

  puell: {
    short: "Puell",
    full_tr: "Puell Multiple",
    full_en: "Puell Multiple",
    what_is: "Madencilerin günlük gelirinin 365-günlük ortalamasına oranı. Madenci ekonomisinin sağlık göstergesi.",
    how_to_read: [
      { range: "< 0.5", emoji: "💎", label: "Madenci Kapitülasyon", meaning: "Madenciler iflasta — tarihsel dip" },
      { range: "0.5-1", emoji: "🟢", label: "Düşük Karda",          meaning: "Madenciler zorda ama satmaktansa biriktiriyor" },
      { range: "1-4",   emoji: "🟡", label: "Normal Kar",            meaning: "Sürdürülebilir madenci ekonomisi" },
      { range: "> 4",   emoji: "⚠️", label: "Aşırı Karlı",          meaning: "Madenciler tarihsel zirvede — sat zamanı sinyali" },
    ],
    why_matters: "Bitcoin'in döngülerini madenci ekonomisi üzerinden gösterir. Madenciler iflas ederken (Puell<0.5) tarihsel olarak dipler oluşmuştur.",
  },

  realized_price: {
    short: "Realized Price",
    full_tr: "Gerçekleşmiş Fiyat",
    full_en: "Realized Price",
    what_is: "Tüm coin'lerin son hareket ettiği ortalama fiyat. Piyasanın ortalama maliyet temeli — uzun vadeli yatırımcıların break-even seviyesi.",
    how_to_read: [
      { range: "Spot < Realized", emoji: "💎", label: "Genel Ağ Zararda", meaning: "Çoğunluk zararına tutuyor — tarihsel olarak dip" },
      { range: "Spot ≈ Realized", emoji: "🟡", label: "Başabaş Bölgesi",  meaning: "Yatırımcılar başabaşta, kararsız" },
      { range: "Spot > Realized", emoji: "🟢", label: "Genel Ağ Karda",   meaning: "Çoğunluk karlı — sağlıklı boğa" },
    ],
    why_matters: "BTC'nin 'gerçek' destek seviyesi. Spot fiyat bunun altına düşerse uzun vadeli desteğin kırıldığı söylenir.",
  },

  // ── Risk & Türev ──────────────────────────────────────────────────────────
  leverage_ratio: {
    short: "Kaldıraç",
    full_tr: "Tahmini Kaldıraç Oranı",
    full_en: "Estimated Leverage Ratio",
    what_is: "Borsalardaki açık vadeli pozisyonların, borsadaki BTC rezervine oranı. Yüksekse piyasa kaldıraçla şişmiş demektir.",
    how_to_read: [
      { range: "< 0.20",  emoji: "🟢", label: "Düşük Risk",     meaning: "Sağlıklı, kaldıraç birikmemiş" },
      { range: "0.20-0.30", emoji: "🟡", label: "Normal",        meaning: "Tipik aralık" },
      { range: "0.30-0.36", emoji: "🟠", label: "Yüksek",         meaning: "Sıkışma riski büyüyor — stop-loss şart" },
      { range: "> 0.36",  emoji: "🔴", label: "Kritik",          meaning: "Tasfiye dalgası riski yüksek — iğne hareketi gelebilir" },
    ],
    why_matters: "Aniden 5K-10K dolarlık 'iğne' fiyat hareketleri kaldıraç tasfiyelerinden kaynaklanır. Yüksek kaldıraç = volatilite kaçınılmaz.",
  },

  funding_rates: {
    short: "Funding",
    full_tr: "Fonlama Oranları",
    full_en: "Perpetual Futures Funding Rates",
    what_is: "Vadeli kontratlarda long/short pozisyonlar arasındaki ödeme dengesi. Pozitif = long pozisyonlar short'lara ödüyor (yani long'lar baskın).",
    how_to_read: [
      { range: "< -0.001%", emoji: "🟢", label: "Short Sıkışması", meaning: "Short pozisyonlar ödüyor — bears tükeniyor" },
      { range: "±0.001%",   emoji: "🟡", label: "Dengeli",          meaning: "Long/short dengeli" },
      { range: "> 0.01%",   emoji: "⚠️", label: "Aşırı Long",       meaning: "Long'lar agresif baskın — ters köşe riski" },
    ],
    why_matters: "Herkes long pozisyondaysa, fiyatın yukarı gidebilmesi için yeni alıcı kalmaz. Aşırı pozitif funding → 'long squeeze' işareti.",
  },

  open_interest: {
    short: "OI",
    full_tr: "Açık Pozisyon",
    full_en: "Open Interest",
    what_is: "Vadeli işlemlerde toplam açık kontrat sayısının USD karşılığı. Piyasaya akan kaldıraç miktarının hacim göstergesi.",
    how_to_read: [
      { range: "Düşüyor", emoji: "🟡", label: "Pozisyon Kapanıyor", meaning: "Yatırımcılar riski azaltıyor" },
      { range: "Stabil",  emoji: "🟡", label: "Stabil",              meaning: "Mevcut seviye korunuyor" },
      { range: "Hızlı artıyor", emoji: "⚠️", label: "Risk Birikiyor", meaning: "Kaldıraç eklenmesi → volatilite artar" },
    ],
    why_matters: "Fiyat artışı + OI artışı = sağlıklı; fiyat artışı + OI azalışı = zayıf rally. Kombinasyonu okumak şart.",
  },

  coinbase_premium: {
    short: "Coinbase Primi",
    full_tr: "Coinbase Premium Endeksi",
    full_en: "Coinbase Premium Index",
    what_is: "Coinbase'deki BTC fiyatının Binance fiyatından farkı. Pozitif = Coinbase pahalı = ABD kurumsal alıcılar baskın.",
    how_to_read: [
      { range: "< -5",  emoji: "🔴", label: "ABD Kurumsal Satışı",  meaning: "Batı tarafı fiyatı aşağı çekiyor" },
      { range: "-5 → +5", emoji: "🟡", label: "Nötr",               meaning: "Fiyat dengeleri korunmuş" },
      { range: "> +5",  emoji: "🟢", label: "ABD Kurumsal Alımı",  meaning: "Wall Street + ABD ETF alıcıları aktif" },
    ],
    why_matters: "ABD kurumsal alımı (BlackRock, Fidelity ETF'leri) ralliye güç verir. Coinbase primi negatife dönerse Batı çekildi demektir.",
  },

  hash_rate: {
    short: "Hash Rate",
    full_tr: "Ağ Hash Oranı",
    full_en: "Network Hash Rate",
    what_is: "Bitcoin ağına bağlı toplam madencilik gücü. 7 günlük değişim ağın güçlenip güçlenmediğini gösterir.",
    how_to_read: [
      { range: "< -5% (7G)", emoji: "🟡", label: "Hash Düşüşü",   meaning: "Madenciler kapanıyor — kısa vadeli zayıflık" },
      { range: "±5% (7G)",   emoji: "🟡", label: "Stabil",         meaning: "Normal dalgalanma" },
      { range: "> +5% (7G)", emoji: "🟢", label: "Ağ Güçleniyor", meaning: "Madenci sayısı artıyor — uzun vadeli güven" },
    ],
    why_matters: "Hash rate ağın 'sigorta primi'dir. Yükseliş trendi madencinin fiyat beklentisinin yüksek olduğunu gösterir.",
  },
};

export function getMetricInfo(key: string): MetricInfo | null {
  return METRIC_INFO[key] || null;
}
