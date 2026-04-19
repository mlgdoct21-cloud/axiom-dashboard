'use client';

import StockPage from '@/components/stocks/StockPage';

/**
 * /dashboard/stocks
 * Full stock analysis page with AXIOM v3.0 integration
 */
export default function StocksPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <StockPage locale="tr" />
    </div>
  );
}
