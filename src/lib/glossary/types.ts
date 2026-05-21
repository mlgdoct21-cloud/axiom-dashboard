/**
 * AXIOM Sözlük — birleşik tip katmanı.
 *
 * Her terim aynı formatta: ne anlama geliyor (what_is), nasıl okunur
 * (how_to_read — bant-bant), neden önemli (why_matters), tipik yanılgı
 * (pitfall). Bu format CryptoQuant on-chain metrikleri için yazılmıştı;
 * burada opsiyon/bilanço/makro/teknik kategorilerine genelleştirildi.
 */

export interface ReadingBand {
  range: string;
  emoji: string;
  label: string;
  meaning: string;
}

export type GlossaryCategory =
  | 'onchain'
  | 'options'
  | 'fundamental'
  | 'macro'
  | 'technical';

export interface GlossaryTerm {
  slug: string;
  short: string;
  full_tr: string;
  full_en?: string;
  category: GlossaryCategory;
  subcategory?: string;
  what_is: string;
  how_to_read?: ReadingBand[];
  why_matters: string;
  pitfall?: string;
}

export interface GlossaryCategoryMeta {
  id: GlossaryCategory;
  label: string;
  emoji: string;
  description: string;
  color: string;
}
