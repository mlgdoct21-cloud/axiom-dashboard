/**
 * Turkish display labels for the YAML sector keys.
 * Mirrors backend `services/macro_sources/sector_labels.py` — keep in sync.
 */
export const SECTOR_LABELS_TR: Record<string, string> = {
  commodities: 'Emtia',
  consumer_discretionary: 'İhtiyari Tüketim',
  consumer_staples: 'Temel Tüketim',
  defensives: 'Defansif Hisseler',
  em_exposure: 'Gelişen Piyasalar',
  energy: 'Enerji',
  financials: 'Bankalar',
  growth_stocks: 'Büyüme Hisseleri',
  industrials: 'Sanayi',
  materials: 'Hammadde',
  real_estate: 'Gayrimenkul',
  small_caps: 'Küçük Ölçek',
  tech: 'Teknoloji',
  utilities: 'Kamu Hizmetleri',
};

export function sectorLabelTr(key: string): string {
  if (!key) return '';
  if (key in SECTOR_LABELS_TR) return SECTOR_LABELS_TR[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
