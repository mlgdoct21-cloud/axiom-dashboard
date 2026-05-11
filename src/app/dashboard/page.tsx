'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CheckoutSuccessInterstitial from '@/components/CheckoutSuccessInterstitial';

/**
 * /dashboard is now a thin waystation:
 *  - When Stripe lands the user here with ?upgrade=success&session_id=X
 *    (optionally ?login_token=Y from the auth bridge in dashboard/layout),
 *    mount the CheckoutSuccessInterstitial; it polls /billing/checkout-status
 *    until the webhook flips users.tier and then navigates to /tr.
 *  - Otherwise immediately redirect to /tr — the rich CryptoPanic-style
 *    dashboard at /[locale] is the canonical landing for paying users.
 *    The old basic news-cards UI that lived here was bypassing the
 *    DashboardSummary chips + watchlist + 3-column feed the user expects.
 *
 * Subpaths /dashboard/portfolio, /dashboard/settings, etc. still work and
 * use the same layout wrapper, so the existing tab navigation isn't broken.
 */
function DashboardWaystation() {
  const router = useRouter();
  const params = useSearchParams();
  const isPostCheckout = params.get('upgrade') === 'success';

  useEffect(() => {
    if (isPostCheckout) return; // let interstitial handle navigation
    router.replace('/tr');
  }, [isPostCheckout, router]);

  if (isPostCheckout) {
    return <CheckoutSuccessInterstitial />;
  }
  // Brief spinner while the redirect kicks in — keeps the user from seeing
  // a flash of empty page on slow networks.
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141425]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4fc3f7]"></div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#141425]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4fc3f7]"></div>
        </div>
      }
    >
      <DashboardWaystation />
    </Suspense>
  );
}
