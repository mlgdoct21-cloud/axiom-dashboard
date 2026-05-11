'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';

function TelegramAuthContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Token parametresi eksik. Lütfen Telegram bot\'undan yeni bir /login linki isteyin.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/telegram-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          cache: 'no-store',
        });
        const data = await r.json();
        if (cancelled) return;

        if (!r.ok || !data.access_token) {
          const detail = data?.detail || data?.error || `HTTP ${r.status}`;
          setStatus('error');
          // Common cases: token süresi doldu, kullanıldı, geçersiz
          if (r.status === 401) {
            setErrorMsg('Bu giriş linki süresi dolmuş, daha önce kullanılmış veya geçersiz. Telegram bot\'undan /login yazıp yeni bir link isteyin.');
          } else {
            setErrorMsg(`Giriş başarısız: ${detail}`);
          }
          return;
        }

        // Persist tokens in the same shape that lib/api.ts expects
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_KEY, JSON.stringify(data));
        }
        setStatus('success');
        // Tiny delay so the success state is visible. Land on /tr (rich
        // CryptoPanic-style dashboard) rather than the basic /dashboard
        // news-cards page — that route was the old default but bypasses
        // DashboardSummary chips + watchlist that paying users expect.
        setTimeout(() => router.push('/tr'), 700);
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(e?.message ?? 'Bağlantı hatası');
      }
    })();
    return () => { cancelled = true; };
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            AXIOM
          </h1>

          {status === 'pending' && (
            <>
              <div className="my-8 flex justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Telegram girişiniz doğrulanıyor...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="my-8 text-6xl">✅</div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Giriş başarılı! Dashboard'a yönlendiriliyorsunuz...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="my-8 text-6xl">⚠️</div>
              <p className="text-red-600 dark:text-red-400 mb-4 text-sm">
                {errorMsg}
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:opacity-90 transition"
              >
                Giriş Sayfasına Dön
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Telegram bot'una <code className="px-1 bg-gray-100 dark:bg-gray-800 rounded">/login</code> yazarak yeni bir link alın.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TelegramAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TelegramAuthContent />
    </Suspense>
  );
}
