/**
 * Makro veriler kategorisi — Fed/BLS/BEA/Hazine veri serileri ve
 * AXIOM Macro Storyteller'da geçen kavramlar.
 */

import type { GlossaryTerm } from './types';

export const MACRO_TERMS: GlossaryTerm[] = [
  {
    slug: 'cpi', short: 'TÜFE', full_tr: 'Tüketici Fiyat Endeksi', full_en: 'CPI',
    category: 'macro', subcategory: 'Enflasyon',
    what_is: 'Tipik bir tüketici sepetinin (gıda, enerji, kira, sağlık vs.) bir önceki aya/yıla göre fiyat değişimi.',
    how_to_read: [
      { range: 'YoY < 2%', emoji: '🟢', label: 'Hedefin altı', meaning: 'Fed/TCMB hedefi (2%) altı — gevşek politika alanı' },
      { range: 'YoY 2-3%', emoji: '🟡', label: 'Hedef bandı', meaning: 'Sürdürülebilir, faiz kararları nötr' },
      { range: 'YoY 3-5%', emoji: '🟠', label: 'Yüksek', meaning: 'Sıkı politika baskısı, faiz indirimi gecikir' },
      { range: 'YoY > 5%', emoji: '🔴', label: 'Sıcak', meaning: 'Faiz artışı veya artış uzunluğu — risk varlıkları baskılı' },
    ],
    why_matters: 'Fed kararlarını şekillendiren birincil veri. CPI sürprizi → tahvil getirisi → hisse + kripto reaksiyonu zinciri.',
    pitfall: 'Manşet CPI gıda/enerji volatilitesi taşır. Core CPI (gıda+enerji hariç) Fed\'in baktığı asıl seri.',
  },
  {
    slug: 'core-cpi', short: 'Çekirdek TÜFE', full_tr: 'Çekirdek TÜFE', full_en: 'Core CPI',
    category: 'macro', subcategory: 'Enflasyon',
    what_is: 'Manşet CPI\'dan gıda ve enerji çıkarılmış hâli. "Eğilimsel" enflasyon göstergesi.',
    why_matters: 'Fed\'in fiili rehberi. Manşet düşse bile Core inatçıysa indirim gecikir (2024-2025 sticky inflation hikâyesi).',
  },
  {
    slug: 'pce', short: 'PCE', full_tr: 'Kişisel Tüketim Harcamaları Deflatörü', full_en: 'PCE',
    category: 'macro', subcategory: 'Enflasyon',
    what_is: 'BEA\'nın yayınladığı, Fed\'in resmi hedef metriği olan enflasyon ölçüsü. CPI\'dan farklı sepet ağırlıkları kullanır.',
    why_matters: 'Fed 2% hedefini PCE üzerinden tanımlar — CPI değil. Core PCE %2\'ye yaklaştıkça indirim mantığı güçlenir.',
    pitfall: 'CPI ile PCE arasında genelde 30-50 bps fark olur (PCE genelde daha düşük). Bu fark sepet ağırlığı + ikame davranışından gelir.',
  },
  {
    slug: 'ppi', short: 'ÜFE', full_tr: 'Üretici Fiyat Endeksi', full_en: 'PPI',
    category: 'macro', subcategory: 'Enflasyon',
    what_is: 'Üreticilerin sattığı malların fiyatı — CPI\'nın "öncül göstergesi", maliyet enflasyonu kanalı.',
    why_matters: 'PPI sürprizi gelecek CPI\'yı haber verir. Üretici fiyat baskısı sonunda tüketiciye yansır.',
  },
  {
    slug: 'nfp', short: 'NFP', full_tr: 'Tarım Dışı İstihdam', full_en: 'Nonfarm Payrolls',
    category: 'macro', subcategory: 'İstihdam',
    what_is: 'ABD\'de tarım dışı sektörde aylık net istihdam değişimi. BLS\'nin Cuma sabahı yayınlar.',
    how_to_read: [
      { range: 'NFP > 250K', emoji: '🟠', label: 'Sıcak', meaning: 'Ücret baskısı + enflasyon — Fed indirimi geciktirir' },
      { range: '100K-250K', emoji: '🟢', label: 'Sağlıklı', meaning: 'Sürdürülebilir büyüme, dengeli istihdam' },
      { range: '0-100K', emoji: '🟡', label: 'Yavaşlama', meaning: 'Soğuma sinyali, indirim olasılığı artar' },
      { range: '< 0', emoji: '🔴', label: 'Resesyon sinyali', meaning: 'İstihdam kaybı, acil gevşeme baskısı' },
    ],
    why_matters: 'Fed\'in çift mandasından biri (istihdam + fiyat istikrarı). NFP sürprizi → faiz beklentisi → varlık fiyatları.',
    pitfall: 'Önceki ay revize edilebilir — başlangıç rakamı kesin değildir. Sektörel kırılım (sağlık, kamu) manşeti çarpıtabilir.',
  },
  {
    slug: 'unrate', short: 'İşsizlik', full_tr: 'İşsizlik Oranı', full_en: 'Unemployment Rate',
    category: 'macro', subcategory: 'İstihdam',
    what_is: 'İşgücüne katılan ama iş bulamayan kişilerin oranı.',
    why_matters: 'Sahm Rule: işsizlik 3-ay ortalaması, son 12 ay düşüğüne göre 0.5 puan artarsa resesyon sinyali. Fed bunu çok yakından izler.',
  },
  {
    slug: 'jobless-claims', short: 'İşsizlik Başvuruları', full_tr: 'Haftalık İşsizlik Başvuruları', full_en: 'Initial Jobless Claims',
    category: 'macro', subcategory: 'İstihdam',
    what_is: 'Her hafta yeni işsizlik sigortası başvurusu yapan kişi sayısı. Yüksek frekanslı (haftalık) istihdam göstergesi.',
    why_matters: 'NFP\'den daha sık (haftalık), trendi erken yakalar. 4-haftalık ortalama 250K\'in altı = güçlü piyasa.',
  },
  {
    slug: 'fomc', short: 'FOMC', full_tr: 'Federal Açık Piyasa Komitesi', full_en: 'FOMC',
    category: 'macro', subcategory: 'Para Politikası',
    what_is: 'Fed\'in para politikası kararını alan komite. Yılda 8 toplantı yapar, federal funds rate\'i belirler.',
    why_matters: 'Karar günü tüm risk varlıklar volatil — açıklama saati (14:00 ET) + Powell basın toplantısı (14:30 ET). 25 bps sürprizi piyasayı %1-2 hareket ettirebilir.',
  },
  {
    slug: 'dot-plot', short: 'Dot Plot', full_tr: 'Nokta Grafiği', full_en: 'Dot Plot',
    category: 'macro', subcategory: 'Para Politikası',
    what_is: 'FOMC üyelerinin her birinin gelecekteki faiz beklentisini noktayla işaretlediği grafik. Her 3 ayda bir (Mart/Haziran/Eylül/Aralık) güncellenir.',
    why_matters: 'Medyan noktayı piyasa beklentisi (Fed Funds Futures) ile karşılaştır — fark "şahin" veya "güvercin" sürprizi söyler.',
  },
  {
    slug: 'sep', short: 'SEP', full_tr: 'Ekonomik Projeksiyonlar Özeti', full_en: 'Summary of Economic Projections',
    category: 'macro', subcategory: 'Para Politikası',
    what_is: 'FOMC üyelerinin GDP, işsizlik, enflasyon, fed funds tahminleri. Dot plot bu setin parçasıdır.',
    why_matters: 'Fed\'in "core view"\'u — kendi senaryolarını ne kadar değiştirdiğini görmek piyasa pozisyonlanması için kritik.',
  },
  {
    slug: 'm2', short: 'M2', full_tr: 'Geniş Para Arzı', full_en: 'M2 Money Supply',
    category: 'macro', subcategory: 'Likidite',
    what_is: 'Dolaşımdaki nakit + çek hesapları + tasarruf hesapları + para piyasası fonları. "Ekonomide kaç dolar dolaşıyor."',
    why_matters: 'M2 YoY büyümesi risk varlıklarla pozitif korelasyon — 2020-21 patlaması altın + kripto + hisseyi şişirdi; 2022-23 daralması düzeltmeyi tetikledi.',
  },
  {
    slug: 'retail-sales', short: 'Perakende Satış', full_tr: 'Perakende Satışlar', full_en: 'Retail Sales',
    category: 'macro', subcategory: 'Talep',
    what_is: 'ABD\'de aylık perakende sektörü satış değişimi. Tüketici harcamasının gerçek-zamanlı göstergesi.',
    why_matters: 'GDP\'nin ~%70\'i tüketim. Retail sales soğuduğu zaman resesyon yaklaştığı sinyali; ısındığında Fed sıkı kalır.',
  },
];
