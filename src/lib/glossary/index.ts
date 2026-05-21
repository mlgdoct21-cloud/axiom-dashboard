/**
 * AXIOM Sözlük — master index.
 *
 * 5 kategori, ~98 terim. Akademi içindeki "Sözlük" sekmesi ve geleceğin
 * inline ⓘ tooltip'leri bu modülden besleniyor.
 */

import type { GlossaryTerm, GlossaryCategory, GlossaryCategoryMeta } from './types';
import { ONCHAIN_TERMS } from './onchain';
import { OPTIONS_TERMS } from './options';
import { FUNDAMENTAL_TERMS } from './fundamental';
import { MACRO_TERMS } from './macro';
import { TECHNICAL_TERMS } from './technical';

export * from './types';

export const CATEGORIES: GlossaryCategoryMeta[] = [
  {
    id: 'onchain',
    label: 'On-Chain Metrikler',
    emoji: '🔗',
    description: 'Borsa akışı, balina, türev, stablecoin, ağ sağlığı — CryptoQuant veri okuryazarlığı.',
    color: '#4fc3f7',
  },
  {
    id: 'options',
    label: 'Opsiyon & Greekler',
    emoji: '🎯',
    description: 'Call/Put, Theta/Vega/Delta, hedge stratejileri, IV/VIX — saat metaforuyla.',
    color: '#ff9800',
  },
  {
    id: 'fundamental',
    label: 'Bilanço & Fundamental',
    emoji: '💼',
    description: 'F/K, ROE, FCF, EBITDA — hisse temel analiz terimleri ve nasıl okunmaları.',
    color: '#81c784',
  },
  {
    id: 'macro',
    label: 'Makro Veriler',
    emoji: '📊',
    description: 'CPI, FOMC, NFP, PCE, dot plot — Fed kararlarını ve risk varlık fiyatlarını şekillendiren göstergeler.',
    color: '#ba68c8',
  },
  {
    id: 'technical',
    label: 'Teknik Göstergeler',
    emoji: '📈',
    description: 'RSI, MACD, Bollinger, hacim profili — fiyat-temelli analiz araçları.',
    color: '#ffb74d',
  },
];

export const ALL_TERMS: GlossaryTerm[] = [
  ...ONCHAIN_TERMS,
  ...OPTIONS_TERMS,
  ...FUNDAMENTAL_TERMS,
  ...MACRO_TERMS,
  ...TECHNICAL_TERMS,
];

export function getTermsByCategory(category: GlossaryCategory): GlossaryTerm[] {
  return ALL_TERMS.filter((t) => t.category === category);
}

export function getTermBySlug(slug: string): GlossaryTerm | null {
  return ALL_TERMS.find((t) => t.slug === slug) ?? null;
}

export function searchTerms(query: string): GlossaryTerm[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_TERMS;
  return ALL_TERMS.filter((t) => {
    const haystack = [
      t.short,
      t.full_tr,
      t.full_en ?? '',
      t.subcategory ?? '',
      t.what_is,
      t.why_matters,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getCategoryMeta(category: GlossaryCategory): GlossaryCategoryMeta {
  return CATEGORIES.find((c) => c.id === category)!;
}

export function getSubcategories(category: GlossaryCategory): string[] {
  const terms = getTermsByCategory(category);
  const set = new Set<string>();
  terms.forEach((t) => {
    if (t.subcategory) set.add(t.subcategory);
  });
  return Array.from(set);
}
