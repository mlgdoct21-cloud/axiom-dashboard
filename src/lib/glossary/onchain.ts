/**
 * On-Chain kategorisi — mevcut METRIC_INFO'dan transform edilmiş.
 * Kaynak `@/lib/onchain-glossary` MetricTooltip tarafından hâlâ kullanılıyor,
 * burada sözlük sayfası için aynı veriyi `GlossaryTerm[]` formatına çeviriyoruz.
 */

import { METRIC_INFO } from '@/lib/onchain-glossary';
import type { GlossaryTerm } from './types';

const SUBCATEGORY_MAP: Record<string, string> = {
  exchange_netflow: 'Akıllı Para Akışları',
  whale_ratio: 'Akıllı Para Akışları',
  mpi: 'Akıllı Para Akışları',
  stablecoin_inflow: 'Akıllı Para Akışları',
  coinbase_premium: 'Akıllı Para Akışları',
  mvrv: 'Değerleme',
  nupl: 'Değerleme',
  sopr: 'Değerleme',
  puell: 'Değerleme',
  realized_price: 'Değerleme',
  leverage_ratio: 'Türev Piyasa',
  funding_rates: 'Türev Piyasa',
  open_interest: 'Türev Piyasa',
  hash_rate: 'Ağ Sağlığı',
  xrp_liquidations: 'XRP',
  xrp_taker_buy_sell: 'XRP',
  xrp_supply_ratio: 'XRP',
  xrp_nvt: 'XRP',
  xrp_tx_count: 'XRP',
  eth_supply_ratio: 'Ethereum',
  eth_active_addresses: 'Ethereum',
};

export const ONCHAIN_TERMS: GlossaryTerm[] = Object.entries(METRIC_INFO).map(
  ([slug, m]) => ({
    slug,
    short: m.short,
    full_tr: m.full_tr,
    full_en: m.full_en,
    category: 'onchain' as const,
    subcategory: SUBCATEGORY_MAP[slug] ?? 'Genel',
    what_is: m.what_is,
    how_to_read: m.how_to_read,
    why_matters: m.why_matters,
  })
);
