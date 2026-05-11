'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Full-screen overlay shown right after Stripe redirects to ?upgrade=success.
 *
 * Stripe's redirect can land the user on the dashboard 1-10 seconds BEFORE
 * our webhook flips users.tier. Without this interstitial, the user briefly
 * sees themselves as Free even though Stripe took the money — common cause
 * of support tickets like "I paid but tier is still Free".
 *
 * Behavior:
 *  - Polls GET /billing/checkout-status?session_id=… every 2s
 *  - When backend returns ready=true, fires onReady() and dismisses
 *  - After 30s without ready=true, shows a "still processing" message
 *    with a manual reload button (covers slow webhook edge cases)
 *  - Removes ?upgrade and ?session_id from URL on dismissal so a refresh
 *    doesn't re-trigger the modal
 *
 * Mounted at the top of dashboard/page.tsx so it activates regardless of
 * which dashboard route the user lands on. No-op when the success params
 * are absent (renders null).
 */
const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 30000;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://vivacious-growth-production-4875.up.railway.app/api/v1'
    : 'http://localhost:8000/api/v1');

interface CheckoutStatusResponse {
  ready: boolean;
  stripe_payment_status: string | null;
  stripe_session_status: string | null;
  local_tier: string | null;
  local_subscription_status: string | null;
}

export default function CheckoutSuccessInterstitial() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const upgrade = searchParams.get('upgrade');
  const sessionId = searchParams.get('session_id');

  const [phase, setPhase] = useState<'polling' | 'ready' | 'timeout'>('polling');
  const [readyTier, setReadyTier] = useState<string | null>(null);

  const active = upgrade === 'success' && !!sessionId;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = Math.ceil(TIMEOUT_MS / POLL_INTERVAL_MS);

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(
          `${API_URL}/billing/checkout-status?session_id=${encodeURIComponent(sessionId!)}`,
          { method: 'GET' }
        );
        if (res.ok) {
          const data: CheckoutStatusResponse = await res.json();
          if (data.ready) {
            if (cancelled) return;
            setReadyTier(data.local_tier);
            setPhase('ready');
            // Auto-dismiss after a brief celebration moment. Navigate to /tr
            // (rich CryptoPanic-style dashboard) since the basic /dashboard
            // route is just the auth-bridge waystation for the success_url
            // landing — the user expects the watchlist + macro chips after
            // paying, not the bare news cards. router.refresh() so useAuth
            // re-fetches the user with the new tier.
            setTimeout(() => {
              if (cancelled) return;
              router.replace('/tr');
              router.refresh();
            }, 1500);
            return;
          }
        }
      } catch {
        // network blip — keep polling
      }
      if (attempts >= maxAttempts) {
        setPhase('timeout');
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [active, sessionId, router]);

  if (!active) return null;

  const tierLabel = readyTier === 'advance' ? 'Advance' : readyTier === 'premium' ? 'Premium' : '';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-[#141425] border border-[#2a2a3e] rounded-xl p-8 text-center shadow-2xl">
        {phase === 'polling' && (
          <>
            <div className="mx-auto h-16 w-16 mb-4 animate-spin rounded-full border-4 border-[#4fc3f7] border-t-transparent" />
            <h2 className="text-xl font-bold text-[#e0e0e0] mb-2">Ödemen onaylanıyor…</h2>
            <p className="text-sm text-[#8888a0]">
              Stripe ödemeni başarıyla aldı, hesabını güncelliyoruz. Bu birkaç saniye sürebilir.
            </p>
          </>
        )}
        {phase === 'ready' && (
          <>
            <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-400 mb-2">
              Hoş geldin{tierLabel ? `, ${tierLabel} kullanıcı` : ''}!
            </h2>
            <p className="text-sm text-[#8888a0]">Hesabın güncellendi, kaynaklarına erişebilirsin.</p>
          </>
        )}
        {phase === 'timeout' && (
          <>
            <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center rounded-full bg-amber-500/20">
              <svg className="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-amber-400 mb-2">İşlem onaylanıyor</h2>
            <p className="text-sm text-[#8888a0] mb-4">
              Stripe ödemeni aldı ama sistemimiz henüz tier güncellemesini almadı. Bu birkaç dakika içinde otomatik düzelir. Sayfayı yenileyebilirsin.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#4fc3f7] hover:bg-[#3da6d6] text-[#0d0d1a] font-medium rounded-lg transition"
            >
              Sayfayı Yenile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
