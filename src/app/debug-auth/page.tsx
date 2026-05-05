'use client';

import { useEffect, useState } from 'react';

const AUTH_KEY = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';

export default function DebugAuthPage() {
  const [state, setState] = useState<any>({});

  useEffect(() => {
    const collect = async () => {
      const out: any = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        location: window.location.href,
        hostname: window.location.hostname,
        authKey: AUTH_KEY,
        localStorageRaw: localStorage.getItem(AUTH_KEY) || 'NULL',
      };

      try {
        const parsed = out.localStorageRaw === 'NULL' ? null : JSON.parse(out.localStorageRaw);
        out.localStorageParsed = parsed;
        out.hasAccessToken = !!parsed?.access_token;
        out.tokenPreview = parsed?.access_token?.slice(0, 30) + '...';
      } catch (e: any) {
        out.parseError = e.message;
      }

      // Test 1: API_URL — what does the bundle think?
      // (Cannot directly access; reflect via test fetch)
      try {
        const r = await fetch('https://vivacious-growth-production-4875.up.railway.app/api/v1/users/me', {
          headers: out.hasAccessToken
            ? { Authorization: `Bearer ${JSON.parse(out.localStorageRaw).access_token}` }
            : {},
        });
        out.directRailwayFetch = {
          status: r.status,
          ok: r.ok,
          body: await r.text().then(t => t.slice(0, 200)),
        };
      } catch (e: any) {
        out.directRailwayFetch = { error: e.message };
      }

      setState(out);
    };
    collect();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 12, color: '#0f0', background: '#000', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', fontSize: 16 }}>🔧 AXIOM Auth Debug</h1>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(state, null, 2)}
      </pre>
      <button
        onClick={() => { localStorage.removeItem(AUTH_KEY); location.reload(); }}
        style={{ marginTop: 20, padding: 10, background: '#f00', color: '#fff', border: 'none' }}
      >
        Clear localStorage + reload
      </button>
    </div>
  );
}
