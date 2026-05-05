import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// Production security headers
// CSP — TradingView Lightweight Charts ve Recharts inline style kullandığı için
// 'unsafe-inline' style kabul ediyoruz. script-src için 'unsafe-eval' Next.js
// development modunda gerekiyor; production'da kaldırılabilir.
const isDev = process.env.NODE_ENV !== 'production';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  // CRITICAL: include the Railway backend API. Day 21 we discovered the
  // Telegram /login flow was silently broken because the dashboard's
  // useAuth.checkAuth tried to fetch /users/me on Railway, but the
  // browser's CSP blocked it ("Load failed"), JWT was never persisted,
  // user bounced to /auth/login. The CORS allow-list on the backend was
  // also wrong but THAT bug was masked behind this CSP one.
  "connect-src 'self' https://generativelanguage.googleapis.com https://api.coingecko.com https://api.binance.com https://api.ethplorer.io https://api.github.com https://*.supabase.co https://api.telegram.org https://*.up.railway.app",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // X-Powered-By header'ı Next.js sürümünü açığa çıkarır — kapat
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
