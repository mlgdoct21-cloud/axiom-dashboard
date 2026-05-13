'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://vivacious-growth-production-4875.up.railway.app/api/v1'
    : 'http://localhost:8000/api/v1');

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [telegramId, setTelegramId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshing, setAutoRefreshing] = useState(true);

  // Mount'ta mevcut refresh_token varsa otomatik olarak silent-refresh dene.
  // Başarılıysa kullanıcı login formunu hiç görmeden `next` veya /tr'ye gider.
  // Bu sayede /login link'ini bir kez kullanan kullanıcı refresh token TTL'i
  // (7 gün) süresince localhost'ta sıfır friction yaşar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(AUTH_KEY) : null;
        if (!raw) return;
        let parsed: { refresh_token?: string } = {};
        try { parsed = JSON.parse(raw); } catch { return; }
        if (!parsed.refresh_token) return;

        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: parsed.refresh_token }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.access_token) return;
        // Rotated refresh_token (varsa) kaydet — sliding-window oturum.
        const merged = {
          ...parsed,
          access_token: data.access_token,
          ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(merged));

        if (cancelled) return;
        const next = searchParams.get('next') || '/tr';
        router.replace(next);
      } catch {
        /* sessiz başarısızlık — form zaten gösterilecek */
      } finally {
        if (!cancelled) setAutoRefreshing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!telegramId.trim()) {
        throw new Error('Telegram ID is required');
      }

      await apiClient.login(telegramId);
      router.push('/tr');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (autoRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8 text-center">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
              AXIOM
            </h1>
            <div className="my-8 flex justify-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm">Oturum kontrol ediliyor…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              AXIOM
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Financial Co-Pilot</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Telegram ID Input */}
            <div>
              <label htmlFor="telegramId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telegram ID
              </label>
              <input
                id="telegramId"
                type="text"
                placeholder="Enter your Telegram ID (e.g., user_12345)"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !telegramId.trim()}
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>

          {/* Telegram one-tap login (preferred, secure) */}
          <div className="mt-6 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg">
            <p className="text-sm text-cyan-800 dark:text-cyan-300 font-medium mb-1">
              🔐 Telegram ile tek tıkla giriş
            </p>
            <p className="text-xs text-cyan-700 dark:text-cyan-400">
              Bot'a <code className="px-1 bg-white/60 dark:bg-black/30 rounded">/login</code> yazıp gelen linke tıklayın — şifresiz, daha güvenli.
            </p>
          </div>

          {/* Info */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              💡 Enter your Telegram user ID to access your personalized financial news feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 px-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
