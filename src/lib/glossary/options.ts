/**
 * Opsiyon & Greekler kategorisi — backend `data/academy/glossary.yaml`'dan
 * TypeScript'e port. 7 alt-kategori, 45 terim. Türkçe-sezgi birincil,
 * İngilizce karşılığı parens'te referans.
 *
 * Kaynak (canonical): axiom-backend/data/academy/glossary.yaml — değişiklik
 * yaparsan oradan başla, sonra burayı senkronize et.
 */

import type { GlossaryTerm } from './types';

export const OPTIONS_TERMS: GlossaryTerm[] = [
  // ── Anatomi ────────────────────────────────────────────────────────────
  {
    slug: 'call', short: 'Alım (Call)', full_tr: 'Alım Opsiyonu', full_en: 'Call',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Belirli bir fiyattan ALMA hakkı — yükümlülük değil, hak.',
    why_matters: 'Yükselişe inanan veya yükselişe karşı pozisyonunu koruyan kişi alır.',
    pitfall: 'Call ALAN ödeme yapar (prim); call SATAN primi tahsil eder ama yükümlülüğü üstlenir.',
  },
  {
    slug: 'put', short: 'Satım (Put)', full_tr: 'Satım Opsiyonu', full_en: 'Put',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Belirli bir fiyattan SATMA hakkı — portföyün sigortası.',
    why_matters: 'Düşüş korkusu olan veya tuttuğu varlığı koruyan kişi alır.',
    pitfall: 'Put ALMAK sigorta primidir; put SATMAK "piyasa düşerse satın alırım" yükümlülüğüdür.',
  },
  {
    slug: 'strike', short: 'Kullanım Fiyatı', full_tr: 'Kullanım Fiyatı', full_en: 'Strike',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Opsiyonun sözleşme fiyatı — vade sonunda bu seviye referans alınır.',
    why_matters: 'Spot bu seviyeyi geçerse call ITM olur; altında kalırsa put ITM olur.',
  },
  {
    slug: 'vade', short: 'Vade', full_tr: 'Vade', full_en: 'Expiry',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Opsiyonun ömrünün bittiği gün — mainspring tamamen boşaldığı an.',
    why_matters: 'Vade yaklaştıkça zaman değeri eridiği için Theta hızlanır.',
  },
  {
    slug: 'prim', short: 'Prim', full_tr: 'Prim', full_en: 'Premium',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Opsiyon almak için ödenen bedel; iki bileşeni var: içsel değer + zaman değeri.',
    why_matters: 'Prim, kontratın o anki piyasa fiyatıdır — alıcının riski, satıcının kazancı.',
  },
  {
    slug: 'icsel-deger', short: 'İçsel Değer', full_tr: 'İçsel Değer', full_en: 'Intrinsic Value',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Opsiyonu şu an kullansaydık ne kadar para kazanırdık — sözleşmenin "gerçek" kısmı.',
    why_matters: 'Call için max(spot - strike, 0); put için max(strike - spot, 0). Sıfırın altına inmez.',
  },
  {
    slug: 'zaman-degeri', short: 'Zaman Değeri', full_tr: 'Zaman Değeri', full_en: 'Time Value',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Mainspring\'in henüz boşalmamış kısmı — gelecekte fiyat lehine hareket etme şansı.',
    why_matters: 'Prim eksi içsel değer. Vadeye giderken sıfıra koşar.',
  },
  {
    slug: 'exercise', short: 'Kullanma', full_tr: 'Kullanma', full_en: 'Exercise',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Hakkı kullanmak — call ile strike\'tan almak veya put ile strike\'tan satmak.',
    why_matters: 'Çoğu retail opsiyon kullanılmadan kapatılır; pozisyon ters yönde kapanır.',
  },
  {
    slug: 'kontrat-buyuklugu', short: 'Kontrat Büyüklüğü', full_tr: 'Kontrat Büyüklüğü',
    category: 'options', subcategory: 'Anatomi',
    what_is: 'Bir opsiyonun temsil ettiği varlık miktarı.',
    why_matters: 'ABD endeks/hisse: 1 kontrat = 100 hisse. Deribit BTC: 1 kontrat = 1 BTC. Dikkat: ölçek farklı.',
  },

  // ── Pozisyon ───────────────────────────────────────────────────────────
  {
    slug: 'itm', short: 'İçeride (ITM)', full_tr: 'İçeride', full_en: 'In The Money',
    category: 'options', subcategory: 'Pozisyon',
    what_is: 'Şu an kullanılsaydı para kazandırır — içsel değer pozitif.',
    why_matters: 'Call: spot > strike. Put: spot < strike.',
  },
  {
    slug: 'atm', short: 'Yanında (ATM)', full_tr: 'Yanında', full_en: 'At The Money',
    category: 'options', subcategory: 'Pozisyon',
    what_is: 'Spot tam strike\'ta — zaman değeri en yüksek, Gamma en yüksek (en hassas an).',
    why_matters: 'ATM opsiyonlar piyasa yapıcı için en zor hedge edilen bölgedir.',
  },
  {
    slug: 'otm', short: 'Dışarıda (OTM)', full_tr: 'Dışarıda', full_en: 'Out of The Money',
    category: 'options', subcategory: 'Pozisyon',
    what_is: 'Şu an kullanılsaydı sıfır değerli — sadece zaman değeri taşır.',
    why_matters: 'Ucuz görünür ama vadeye giderken theta ile erir; lottery-ticket etkisi.',
  },
  {
    slug: 'breakeven', short: 'Başabaş', full_tr: 'Başabaş Noktası', full_en: 'Breakeven',
    category: 'options', subcategory: 'Pozisyon',
    what_is: 'Vade sonunda zarar etmediğin spot seviyesi.',
    why_matters: 'Long call breakeven: strike + prim. Long put breakeven: strike - prim.',
  },
  {
    slug: 'max-zarar', short: 'Maks. Zarar', full_tr: 'Maksimum Zarar',
    category: 'options', subcategory: 'Pozisyon',
    what_is: 'En kötü senaryoda kaybedebileceğin tutar.',
    why_matters: 'Long opsiyon alıcısı için: ödenen prim. Satıcı için: teorik olarak sınırsız (naked call).',
  },
  {
    slug: 'max-kar', short: 'Maks. Kâr', full_tr: 'Maksimum Kâr',
    category: 'options', subcategory: 'Pozisyon',
    what_is: 'En iyi senaryoda kazanabileceğin tutar.',
    why_matters: 'Long call: sınırsız. Long put: strike - prim (spot sıfıra gitse). Spread\'lerde tavanlı.',
  },

  // ── Greekler ───────────────────────────────────────────────────────────
  {
    slug: 'delta', short: 'Delta', full_tr: 'Fiyat Duyarlılığı', full_en: 'Delta',
    category: 'options', subcategory: 'Greekler',
    what_is: 'Spot 1 birim oynarsa opsiyon primi ne kadar oynar. Aynı zamanda "hedge oranı".',
    why_matters: '0.30 delta call ≈ 0.30 hisseye eşdeğer pozisyon. 100 delta tam hisse gibi davranır. Horology: kadran ibresi — şu anki hız.',
  },
  {
    slug: 'gamma', short: 'Gamma', full_tr: 'Risk İvmesi', full_en: 'Gamma',
    category: 'options', subcategory: 'Greekler',
    what_is: 'Delta\'nın değişme hızı. Yüksek gamma = küçük hareket bile pozisyonu hızla değiştirir.',
    why_matters: 'ATM ve kısa vadeli opsiyonlarda en yüksek; piyasa yapıcılar için en tehlikeli bölge. Horology: escapement mandalı — küçük tetikte büyük zıplama.',
  },
  {
    slug: 'theta', short: 'Theta', full_tr: 'Zaman Kaybı Hızı', full_en: 'Theta',
    category: 'options', subcategory: 'Greekler',
    what_is: 'Her gün opsiyondan ne kadar değer eridiği. Mainspring\'in boşalma hızı.',
    why_matters: 'Long opsiyon alıcısının düşmanı, opsiyon satıcısının dostudur. Vadeye yaklaşınca hızlanır. Horology: mainspring — sarılı yay her tıkırtıda biraz daha boşalır.',
  },
  {
    slug: 'vega', short: 'Vega', full_tr: 'Volatilite Hassasiyeti', full_en: 'Vega',
    category: 'options', subcategory: 'Greekler',
    what_is: 'Implied volatility 1 puan değişirse prim ne kadar değişir.',
    why_matters: 'Uzun vadeli opsiyonlar yüksek vega taşır; VIX/DVOL zıplayınca prim uçar. Horology: balance wheel sıkılığı — havayı ne kadar yakaladığını ayarlar.',
  },
  {
    slug: 'rho', short: 'Rho', full_tr: 'Faiz Hassasiyeti', full_en: 'Rho',
    category: 'options', subcategory: 'Greekler',
    what_is: 'Risk-free faiz değişirse prim ne kadar değişir.',
    why_matters: 'Kısa vadeli opsiyonlarda ihmal edilebilir; uzun vadeli (LEAPS) için önemli.',
  },

  // ── Volatilite ─────────────────────────────────────────────────────────
  {
    slug: 'implied-vol', short: 'IV', full_tr: 'Implied Volatility', full_en: 'Implied Volatility',
    category: 'options', subcategory: 'Volatilite',
    what_is: 'Opsiyon fiyatının ima ettiği gelecek volatilite beklentisi.',
    why_matters: 'IV yüksekse prim pahalı (alıcı zor); düşükse ucuz (satıcı zor).',
  },
  {
    slug: 'realized-vol', short: 'RV', full_tr: 'Realized Volatility', full_en: 'Realized Volatility',
    category: 'options', subcategory: 'Volatilite',
    what_is: 'Geçmişte fiilen yaşanan oynaklık.',
    why_matters: 'IV > RV ise opsiyonlar "pahalı" (satıcı avantajlı). VRP analizinin temeli.',
  },
  {
    slug: 'dvol', short: 'DVOL', full_tr: 'DVOL — Deribit BTC/ETH IV Endeksi',
    category: 'options', subcategory: 'Volatilite',
    what_is: 'Kriptonun VIX\'i — Deribit opsiyonlarından türetilen 30 günlük IV.',
    why_matters: 'BTC DVOL yüksekse kripto opsiyon primleri pahalı; düşükse satıcı için çekici.',
  },
  {
    slug: 'vix', short: 'VIX', full_tr: 'VIX — S&P 500 Korku Endeksi',
    category: 'options', subcategory: 'Volatilite',
    what_is: 'SPX opsiyonlarından türetilen 30 günlük IV; ABD piyasa korku göstergesi.',
    how_to_read: [
      { range: '< 14', emoji: '🟢', label: 'Sakin', meaning: 'Düşük korku, risk-on rejimi' },
      { range: '14-20', emoji: '🟡', label: 'Normal', meaning: 'Tipik piyasa volatilitesi' },
      { range: '20-30', emoji: '🟠', label: 'Endişe', meaning: 'Risk-off başlıyor, hedge talebi artıyor' },
      { range: '> 30', emoji: '🔴', label: 'Panik', meaning: 'Sistemik korku, opsiyon primleri uçtu' },
    ],
    why_matters: 'Mutlak değil rejim göstergesi. Yüksek VIX = pahalı sigorta, düşük VIX = ucuz sigorta.',
  },
  {
    slug: 'iv-rank', short: 'IV Rank', full_tr: 'IV Rank', full_en: 'IV Rank',
    category: 'options', subcategory: 'Volatilite',
    what_is: 'Mevcut IV son 1 yılda hangi seviyede — pahalı mı ucuz mu?',
    how_to_read: [
      { range: 'IVR < 25', emoji: '🟢', label: 'Ucuz', meaning: 'Alıcı için fırsat — opsiyon ALMA' },
      { range: 'IVR 25-75', emoji: '🟡', label: 'Orta', meaning: 'Yön-bağımlı strateji' },
      { range: 'IVR > 75', emoji: '🔴', label: 'Pahalı', meaning: 'Satıcı için fırsat — opsiyon SATMA' },
    ],
    why_matters: 'IVR % son 1 yılın hangi yüzdelik diliminde olduğunu söyler — mutlak IV\'den daha bilgilendirici.',
  },
  {
    slug: 'vol-skew', short: 'Skew', full_tr: 'Volatilite Eğikliği', full_en: 'Skew',
    category: 'options', subcategory: 'Volatilite',
    what_is: 'Aynı vadenin farklı strike\'larında IV neden farklı — piyasa hangi tarafa korku fiyatlıyor.',
    why_matters: 'Hisse opsiyonlarında genelde "OTM put IV > OTM call IV" — düşüş sigortası daha pahalı.',
  },
  {
    slug: 'vrp', short: 'VRP', full_tr: 'Volatilite Risk Primi', full_en: 'Volatility Risk Premium',
    category: 'options', subcategory: 'Volatilite',
    what_is: 'IV - RV — opsiyon satıcısının yapısal olarak topladığı pirim.',
    why_matters: 'Pozitif VRP rejiminde "opsiyon satışı" stratejik anlam taşır (covered call, cash-secured put).',
  },

  // ── Stratejiler ────────────────────────────────────────────────────────
  {
    slug: 'protective-put', short: 'Koruyucu Put', full_tr: 'Koruyucu Satım', full_en: 'Protective Put',
    category: 'options', subcategory: 'Stratejiler',
    what_is: 'Elinde varlık varken put alarak alttan sigorta — "yangın sigortası".',
    why_matters: 'Maks zarar = strike - spot + prim. Maks kâr = sınırsız (spot - prim). Tipik kullanım: BTC tutuyorsun, hard fork öncesi veya FOMC haftası, alttan tabela.',
  },
  {
    slug: 'covered-call', short: 'Covered Call', full_tr: 'Karşılıklı Alım', full_en: 'Covered Call',
    category: 'options', subcategory: 'Stratejiler',
    what_is: 'Elinde varlık varken call satarak prim toplama — "yatay piyasada kira geliri".',
    why_matters: 'Maks kâr = (strike - spot) + alınan prim. Risk: yukarı kaçırırsa fırsat maliyeti. Tipik kullanım: ETH tutuyorsun, kısa vadede patlama beklemiyorsun, OTM call satarak kira topla.',
  },
  {
    slug: 'collar', short: 'Collar', full_tr: 'Yaka', full_en: 'Collar',
    category: 'options', subcategory: 'Stratejiler',
    what_is: 'Aynı anda protective put AL + OTM covered call SAT — sigorta + primi kira ile öde.',
    why_matters: 'Yukarı tavan, aşağı tabela. "Düşük maliyetli sigorta" veya "sıfır maliyetli sigorta". Tipik kullanım: Portföyünü FOMC veya OPEX haftası boyunca dondurmak istiyorsun.',
  },
  {
    slug: 'bull-call-spread', short: 'Bull Call Spread', full_tr: 'Yükselen Yaylım', full_en: 'Bull Call Spread',
    category: 'options', subcategory: 'Stratejiler',
    what_is: 'Düşük strike call AL + yüksek strike call SAT — sınırlı yukarı, ucuza.',
    why_matters: 'Maks kâr ve maks zarar tavanlı. Yön doğru ama hareket sınırlı beklentisi.',
  },
  {
    slug: 'straddle', short: 'Straddle', full_tr: 'Çift Bacak', full_en: 'Straddle',
    category: 'options', subcategory: 'Stratejiler',
    what_is: 'Aynı strike\'tan call + put AL — yönsüz ama sert hareket beklentisi.',
    why_matters: 'Maks zarar = toplam prim. Maks kâr = sınırsız. Theta düşmanın. Tipik kullanım: FOMC veya kripto borsa haberi öncesi, yönü bilmiyorsun ama sert hareket bekliyorsun.',
  },
  {
    slug: 'strangle', short: 'Strangle', full_tr: 'Geniş Çift Bacak', full_en: 'Strangle',
    category: 'options', subcategory: 'Stratejiler',
    what_is: 'Straddle\'ın daha ucuz hali — OTM call + OTM put AL.',
    why_matters: 'Straddle\'dan ucuz ama harekete daha sert ihtiyaç var. Theta yine düşman.',
  },

  // ── Horology (AXIOM marka vokabüleri) ──────────────────────────────────
  {
    slug: 'mainspring', short: 'Mainspring', full_tr: 'Mainspring — Yay Kurumu',
    category: 'options', subcategory: 'Horology',
    what_is: 'Opsiyonun kurulu zaman enerjisi — vadeye kalan ömrü. Saatte: kuruluş yayı.',
    why_matters: 'Zaman değeri = mainspring\'in henüz boşalmamış kısmı.',
  },
  {
    slug: 'escapement', short: 'Escapement', full_tr: 'Escapement — Maşa',
    category: 'options', subcategory: 'Horology',
    what_is: 'Saatin enerjisini sabit hızda salan parça — tıkırtıyı yapan.',
    why_matters: 'Theta tıkırtısı: her gün mainspring biraz daha boşalır.',
  },
  {
    slug: 'balance-wheel', short: 'Balance Wheel', full_tr: 'Balance Wheel — Denge Çarkı',
    category: 'options', subcategory: 'Horology',
    what_is: 'Hassasiyeti ayarlayan salınım çarkı.',
    why_matters: 'Vega + Gamma birlikte balance wheel\'i kurar — volatilite ve fiyat hassasiyetinin dengesi.',
  },
  {
    slug: 'beat-rate', short: 'Beat Rate', full_tr: 'Beat Rate — Tıkırtı Hızı',
    category: 'options', subcategory: 'Horology',
    what_is: 'Saatin saniyede kaç titreşim yaptığı.',
    why_matters: 'Vadeye giderken Theta\'nın hızlanması = beat rate artışı.',
  },
  {
    slug: 'complications', short: 'Complications', full_tr: 'Complications — Karmaşıklıklar',
    category: 'options', subcategory: 'Horology',
    what_is: 'Saatte ana fonksiyonun üstüne eklenen ek fonksiyonlar.',
    why_matters: 'Çok bacaklı stratejiler (spread, condor) = opsiyon complication\'ları.',
  },

  // ── Kurumsal Akış ──────────────────────────────────────────────────────
  {
    slug: 'gex', short: 'GEX', full_tr: 'Gamma Exposure', full_en: 'Gamma Exposure',
    category: 'options', subcategory: 'Kurumsal Akış',
    what_is: 'Piyasa yapıcıların net gamma pozisyonu — pozitifse fiyatı bastırırlar, negatifse hızlandırırlar.',
    why_matters: 'Pozitif GEX rejimi = düşük volatilite, mean-reversion. Negatif GEX = trend, momentum.',
  },
  {
    slug: 'call-wall', short: 'Call Duvarı', full_tr: 'Call Duvarı', full_en: 'Call Wall',
    category: 'options', subcategory: 'Kurumsal Akış',
    what_is: 'Yoğun OI biriken call strike — fiyat oraya yaklaşırsa piyasa yapıcı hisseyi satmak zorunda kalır.',
    why_matters: 'Direnç seviyesi gibi davranır; fiyat oradan döner.',
  },
  {
    slug: 'put-wall', short: 'Put Duvarı', full_tr: 'Put Duvarı', full_en: 'Put Wall',
    category: 'options', subcategory: 'Kurumsal Akış',
    what_is: 'Yoğun OI biriken put strike — fiyat altına inerse hızlı satış tetiklenir.',
    why_matters: 'Destek seviyesi gibi davranır ama kırılırsa hızlanır.',
  },
  {
    slug: 'gamma-flip', short: 'Gamma Flip', full_tr: 'Gama Dönüşü', full_en: 'Gamma Flip',
    category: 'options', subcategory: 'Kurumsal Akış',
    what_is: 'Dealer pozisyonunun pozitiften negatife geçtiği seviye — "fırtına başlıyor" uyarısı.',
    why_matters: 'Fiyat bu seviyenin altına inerse volatilite patlar.',
  },
  {
    slug: 'max-pain', short: 'Max Pain', full_tr: 'Maksimum Acı', full_en: 'Max Pain',
    category: 'options', subcategory: 'Kurumsal Akış',
    what_is: 'Vade sonunda opsiyon alıcılarının toplamda en çok kaybedeceği strike — satıcıların "çektiği" nokta.',
    why_matters: 'Fiyat vadeye giderken bu seviyeye yaklaşma eğilimi gösterir (teori).',
  },
  {
    slug: 'cta-positioning', short: 'CTA Pozisyonu', full_tr: 'CTA Pozisyonlanma',
    category: 'options', subcategory: 'Kurumsal Akış',
    what_is: 'Algoritmik trend-takipçi fonların net pozisyon doygunluğu.',
    why_matters: '%90+ long doygunluk = yeni alıcı kalmadı, tersine dönüş riski yüksek.',
  },
  {
    slug: 'opex', short: 'OPEX', full_tr: 'OPEX Haftası', full_en: 'Options Expiration Week',
    category: 'options', subcategory: 'Kurumsal Akış',
    what_is: 'Aylık veya haftalık opsiyon vade haftası — mainspring topluca boşalır.',
    why_matters: 'Volatilite genelde önce baskılanır, vade sonrası açığa çıkar.',
  },
];
