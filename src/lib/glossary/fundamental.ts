/**
 * Bilanço & Fundamental kategorisi — hisse temel analiz terimleri.
 * AXIOM Fundamental tab + hisse raporlarında geçen metrikler.
 */

import type { GlossaryTerm } from './types';

export const FUNDAMENTAL_TERMS: GlossaryTerm[] = [
  {
    slug: 'pe-ratio', short: 'F/K', full_tr: 'Fiyat / Kazanç', full_en: 'P/E Ratio',
    category: 'fundamental', subcategory: 'Değerleme',
    what_is: 'Hisse fiyatının, hisse başına kâra oranı. "Şu anki kârın kaç katı para ödüyorum?"',
    how_to_read: [
      { range: 'F/K < 10', emoji: '🟢', label: 'Ucuz', meaning: 'Düşük beklenti veya gerçek iskonto — neden ucuz olduğunu sor' },
      { range: 'F/K 10-20', emoji: '🟡', label: 'Normal', meaning: 'S&P 500 ortalaması ~18-22 — sektör ortalamasıyla karşılaştır' },
      { range: 'F/K 20-40', emoji: '🟠', label: 'Pahalı', meaning: 'Yüksek büyüme bekleniyor; sürdüremezse düşer' },
      { range: 'F/K > 40', emoji: '🔴', label: 'Spekülatif', meaning: 'Tech/growth — kâr büyüme çift haneli olmalı' },
    ],
    why_matters: 'Tek başına yetersiz — sektör ve büyüme oranıyla beraber bak. Düşük F/K her zaman ucuz değil (value trap riski).',
    pitfall: 'Negatif kâra sahip şirketlerde F/K anlamsızdır. Tek dönemlik anomali (vergi, satış) F/K\'yı çarpıtır.',
  },
  {
    slug: 'pb-ratio', short: 'P/B', full_tr: 'Fiyat / Defter Değeri', full_en: 'Price-to-Book',
    category: 'fundamental', subcategory: 'Değerleme',
    what_is: 'Hisse fiyatının, hisse başına net defter değerine oranı. "Şirket bugün kapansa eşyaları satılsa, ne kadar para çıkar?" sorusunun çapası.',
    how_to_read: [
      { range: 'P/B < 1', emoji: '🟢', label: 'Defter altı', meaning: 'Piyasa şirketi defter değerinin altında fiyatlıyor — neden?' },
      { range: 'P/B 1-3', emoji: '🟡', label: 'Normal', meaning: 'Bankalar/sigorta için tipik aralık' },
      { range: 'P/B > 3', emoji: '🟠', label: 'Yüksek', meaning: 'Marka değeri veya yüksek ROE — kanıtla beraber kabul edilir' },
    ],
    why_matters: 'Bankalar, sigorta, REIT gibi varlık-ağır sektörlerde anlamlı. Tech şirketleri için (intangible asset baskın) düşük öncelikli.',
  },
  {
    slug: 'ev-ebitda', short: 'EV/EBITDA', full_tr: 'Firma Değeri / FAVÖK', full_en: 'EV/EBITDA',
    category: 'fundamental', subcategory: 'Değerleme',
    what_is: 'Şirketin toplam firma değerini (piyasa kapitalizasyonu + net borç), operasyonel nakit yaratma kapasitesine bölme.',
    why_matters: 'F/K\'dan üstün — borç ve sermaye yapısı farkını giderir. Sektörler arası karşılaştırmada daha sağlam.',
    pitfall: 'EBITDA "uydurulabilir" bir rakam — özel kalemler EBITDA\'yı şişirebilir. Free Cash Flow ile çapraz kontrol et.',
  },
  {
    slug: 'roe', short: 'ROE', full_tr: 'Özsermaye Kârlılığı', full_en: 'Return on Equity',
    category: 'fundamental', subcategory: 'Kârlılık',
    what_is: 'Net kârın özsermayeye oranı. "Hissedarın 100 lirasıyla şirket yılda kaç lira üretiyor?"',
    how_to_read: [
      { range: 'ROE < 5%', emoji: '🔴', label: 'Düşük', meaning: 'Sermayeyi verimli kullanmıyor' },
      { range: 'ROE 5-15%', emoji: '🟡', label: 'Normal', meaning: 'S&P 500 ortalaması ~14%' },
      { range: 'ROE > 15%', emoji: '🟢', label: 'Yüksek', meaning: 'Güçlü rekabet avantajı (moat) işareti' },
      { range: 'ROE > 30%', emoji: '⚠️', label: 'Şüpheli yüksek', meaning: 'Aşırı borç (kaldıraçla şişirilmiş) olabilir — debt/equity\'ye bak' },
    ],
    why_matters: 'Warren Buffett\'ın favori metriği. Kalıcı yüksek ROE = ekonomik moat (marka, ölçek, geçiş maliyeti).',
    pitfall: 'Yüksek borçla şişirilmiş ROE yanıltıcıdır. Mutlaka Debt/Equity ile birlikte değerlendir.',
  },
  {
    slug: 'roa', short: 'ROA', full_tr: 'Aktif Kârlılığı', full_en: 'Return on Assets',
    category: 'fundamental', subcategory: 'Kârlılık',
    what_is: 'Net kârın toplam aktiflere oranı. "Bilançodaki her 100 liralık varlıkla şirket kaç lira üretiyor?"',
    why_matters: 'Sermaye yapısından bağımsız — borç-temelli ROE şişmesini eleyen ölçü. Bankalar için kritik.',
  },
  {
    slug: 'profit-margin', short: 'Kâr Marjı', full_tr: 'Net Kâr Marjı', full_en: 'Net Profit Margin',
    category: 'fundamental', subcategory: 'Kârlılık',
    what_is: 'Net kârın satışlara oranı. "Her 100 liralık satıştan kaç lira cebe kalıyor?"',
    how_to_read: [
      { range: '< 5%', emoji: '🟠', label: 'Düşük marj', meaning: 'Perakende, havayolu, otomotiv tipik aralığı' },
      { range: '5-15%', emoji: '🟡', label: 'Normal', meaning: 'Çoğu sektör için makul' },
      { range: '> 15%', emoji: '🟢', label: 'Yüksek marj', meaning: 'Yazılım/markalı tüketim/eczacılık — fiyatlama gücü var' },
    ],
    why_matters: 'Yüksek + sürdürülebilir marj = ekonomik moat. Marj erozyonu rekabet baskısının ilk işaretidir.',
  },
  {
    slug: 'debt-equity', short: 'D/E', full_tr: 'Borç / Özsermaye', full_en: 'Debt-to-Equity',
    category: 'fundamental', subcategory: 'Bilanço Sağlığı',
    what_is: 'Toplam borcun özsermayeye oranı. "Şirket her 1 lira sermaye için kaç lira borç taşıyor?"',
    how_to_read: [
      { range: 'D/E < 0.5', emoji: '🟢', label: 'Sağlam', meaning: 'Düşük finansal risk' },
      { range: 'D/E 0.5-1.5', emoji: '🟡', label: 'Normal', meaning: 'Çoğu sanayi şirketi için makul' },
      { range: 'D/E 1.5-3', emoji: '🟠', label: 'Yüksek', meaning: 'Faiz artışlarına hassas' },
      { range: 'D/E > 3', emoji: '🔴', label: 'Tehlikeli', meaning: 'Bankalar hariç sektörler için risk; resesyona dayanıksız' },
    ],
    why_matters: 'Faiz oranı yükseldikçe yüksek D/E şirketleri zorlanır. Resesyon stres testinin ilk sorusu.',
  },
  {
    slug: 'current-ratio', short: 'Cari Oran', full_tr: 'Cari Oran', full_en: 'Current Ratio',
    category: 'fundamental', subcategory: 'Bilanço Sağlığı',
    what_is: 'Dönen varlıkların kısa vadeli borçlara oranı. "Bir sonraki 12 ay için ödeme gücü."',
    how_to_read: [
      { range: '< 1', emoji: '🔴', label: 'Yetersiz', meaning: 'Kısa vade borç ödeme riski' },
      { range: '1-2', emoji: '🟡', label: 'Normal', meaning: 'Çoğu sektör için sağlıklı' },
      { range: '> 3', emoji: '🟠', label: 'Aşırı', meaning: 'Sermaye atıl; verimli kullanılmıyor olabilir' },
    ],
    why_matters: 'Likidite stres testinin en basit göstergesi. Resesyonda hayatta kalma kapasitesi.',
  },
  {
    slug: 'fcf', short: 'FCF', full_tr: 'Serbest Nakit Akışı', full_en: 'Free Cash Flow',
    category: 'fundamental', subcategory: 'Nakit Akışı',
    what_is: 'Operasyonel nakit akışından sermaye harcamaları (CAPEX) düşülmüş tutar. "Şirket faaliyetlerden sonra elinde ne kadar gerçek nakit kalıyor?"',
    why_matters: 'Muhasebe oyunlarına en dayanıklı sayı. Temettü, hisse geri alımı, borç ödemesi buradan finanse edilir. Negatif FCF uzun sürerse sermaye çağrısı veya borç gerekir.',
    pitfall: 'Net kâr pozitif ama FCF negatif olabilir (working capital şişirmesi). FCF birincil; net kâr ikincil.',
  },
  {
    slug: 'dividend-yield', short: 'Temettü Verimi', full_tr: 'Temettü Verimi', full_en: 'Dividend Yield',
    category: 'fundamental', subcategory: 'Hissedar Getirisi',
    what_is: 'Yıllık temettünün hisse fiyatına oranı. "Hisseyi tutarsam yılda yüzde kaç nakit getiri alacağım?"',
    how_to_read: [
      { range: '0-2%', emoji: '🟡', label: 'Düşük', meaning: 'Büyüme odaklı şirketler (Apple, MSFT)' },
      { range: '2-5%', emoji: '🟢', label: 'Sağlıklı', meaning: 'Olgun şirketler (KO, JNJ)' },
      { range: '5-8%', emoji: '🟠', label: 'Yüksek', meaning: 'REIT, telekom, enerji — sürdürülebilir mi sorgula' },
      { range: '> 8%', emoji: '🔴', label: 'Şüpheli', meaning: 'Hisse düşmüş olabilir; temettü kesilebilir (yield trap)' },
    ],
    why_matters: 'Düşük faiz rejiminde temettü hisseleri çekici; yüksek faizde tahvile karşı dezavantaj.',
    pitfall: 'Çok yüksek temettü verimi genelde hisse düşüşünden kaynaklanır. Payout ratio ile birlikte bak.',
  },
  {
    slug: 'beta', short: 'Beta', full_tr: 'Beta', full_en: 'Beta',
    category: 'fundamental', subcategory: 'Risk',
    what_is: 'Hissenin endekse göre oynaklık çarpanı. "Endeks 1% oynarsa, hisse istatistiksel olarak ne kadar oynar?"',
    how_to_read: [
      { range: 'β < 0.7', emoji: '🟢', label: 'Defansif', meaning: 'Tüketim, kamu hizmeti, sağlık (KO, PG)' },
      { range: 'β 0.7-1.3', emoji: '🟡', label: 'Piyasa benzeri', meaning: 'Çoğu büyük şirket' },
      { range: 'β > 1.3', emoji: '🟠', label: 'Volatil', meaning: 'Tech/biotech/cyclicals — boğada hızlı yükselir, ayıda hızlı düşer' },
      { range: 'β < 0', emoji: '🔵', label: 'Negatif', meaning: 'Altın, bazı sigorta — piyasa düşerken yükselir' },
    ],
    why_matters: 'Portföy beta\'sı toplam riskini söyler. Defansif bias = düşük beta. Risk-on rejimde yüksek beta daha çok kazanır.',
  },
  {
    slug: 'eps-growth', short: 'EPS Büyüme', full_tr: 'Hisse Başı Kâr Büyümesi', full_en: 'EPS Growth',
    category: 'fundamental', subcategory: 'Büyüme',
    what_is: 'Hisse başına kârın yıllık büyüme oranı. "Şirket kârını ne kadar hızlı büyütüyor?"',
    why_matters: 'F/K\'yı haklılaştıran tek şey kalıcı kâr büyümesidir (PEG mantığı). EPS büyümesi 0\'a düşerse premium F/K çöker.',
    pitfall: 'Hisse geri alımı EPS\'yi yapay büyütür — pay sayısı azalır ama kâr artmaz. Net kâr büyümesi ile çapraz kontrol.',
  },
];
