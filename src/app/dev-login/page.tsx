'use client';

import { useEffect, useState } from 'react';

/**
 * Localhost-only dev login bootstrap.
 * start-local.sh açar: /dev-login?t=<base64-encoded-auth-json>
 * Sayfa localStorage'a yazar ve /tr'ye yönlendirir. Production'da no-op.
 */
export default function DevLoginPage() {
  const [msg, setMsg] = useState('Bootstrap çalışıyor…');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      setMsg('Bu sayfa sadece localhost için çalışır.');
      return;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('t');
      if (!t) {
        setMsg('Token yok (?t=… parametresi gerekli).');
        return;
      }
      const decoded = JSON.parse(atob(t));
      const storageKey = process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY || 'axiom_auth';
      localStorage.setItem(storageKey, JSON.stringify(decoded));
      setMsg('✓ Advance oturum açıldı, /tr\'ye yönlendiriliyor…');
      setTimeout(() => { window.location.href = '/tr'; }, 400);
    } catch (e) {
      setMsg('Hata: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', color: '#0f0', background: '#000', minHeight: '100vh' }}>
      <h1>AXIOM Dev Login</h1>
      <p>{msg}</p>
    </div>
  );
}
