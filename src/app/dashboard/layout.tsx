'use client';

import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';

const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';

function LoadingSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141425]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4fc3f7]"></div>
    </div>
  );
}

/**
 * Auth gate + Stripe post-checkout login_token bridge.
 *
 * Wrapped in Suspense by the default export — useSearchParams() forces
 * dynamic rendering at the boundary where it's called, so isolating it here
 * keeps the rest of the dashboard layout statically renderable. Without the
 * Suspense wrap the build fails: "useSearchParams() should be wrapped in a
 * suspense boundary at page /dashboard/crypto."
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  // Stripe post-checkout flow: success_url carries a one-time login_token
  // minted by the backend at create_checkout_session time. Without this, a
  // paying user opening the Stripe link from Telegram's in-app browser has
  // no JWT in that browser's localStorage and would get bounced to
  // /auth/login the instant they redirect back from Stripe — making the
  // payment look like it failed even though Stripe took the money.
  const loginToken = params.get('login_token');
  const [exchanging, setExchanging] = useState<boolean>(!!loginToken);
  const exchangeAttempted = useRef<boolean>(false);

  useEffect(() => {
    if (!loginToken || exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    (async () => {
      try {
        const r = await fetch('/api/auth/telegram-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: loginToken }),
          cache: 'no-store',
        });
        if (r.ok) {
          const data = await r.json();
          if (data?.access_token && typeof window !== 'undefined') {
            localStorage.setItem(AUTH_KEY, JSON.stringify(data));
            // Drop login_token from the URL so a refresh doesn't try to
            // re-consume an already-burned token (would 401). Keep upgrade
            // + session_id so CheckoutSuccessInterstitial still fires.
            const url = new URL(window.location.href);
            url.searchParams.delete('login_token');
            // Hard reload — useAuth reads localStorage on mount, doesn't
            // observe writes. Reload picks up the new JWT cleanly.
            window.location.replace(url.pathname + (url.search || ''));
            return; // unmounting, skip setExchanging
          }
        }
        // Token invalid / expired / already used → fall through to the normal
        // auth check which will bounce to /auth/login. User can re-do /login
        // in the bot if needed; payment is already safely recorded.
      } catch {
        // Network blip — same fallthrough
      }
      setExchanging(false);
    })();
  }, [loginToken]);

  useEffect(() => {
    // Suspend the redirect while a login_token exchange is in flight,
    // otherwise the user briefly sees /auth/login before the exchange
    // completes and reloads them back here.
    if (exchanging) return;
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router, exchanging]);

  if (isLoading || exchanging) {
    return <LoadingSplash />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#141425]">
      <Header />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingSplash />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
