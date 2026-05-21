'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useState } from 'react';
import { QuotaBadge } from './QuotaBadge';

export function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#2a2a3e] bg-[#1a1a2e]">
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-12">
          {/* Logo - Atom with orbits */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <ellipse cx="50" cy="50" rx="38" ry="18" stroke="#e0e0e0" strokeWidth="2" transform="rotate(0 50 50)" opacity="0.4" />
              <ellipse cx="50" cy="50" rx="38" ry="18" stroke="#e0e0e0" strokeWidth="2" transform="rotate(60 50 50)" opacity="0.4" />
              <ellipse cx="50" cy="50" rx="38" ry="18" stroke="#e0e0e0" strokeWidth="2" transform="rotate(120 50 50)" opacity="0.4" />
              <circle cx="50" cy="50" r="8" fill="#e0e0e0" />
              <circle cx="88" cy="50" r="4" fill="#4fc3f7" />
              <circle cx="31" cy="17" r="4" fill="#4fc3f7" />
              <circle cx="31" cy="83" r="4" fill="#4fc3f7" />
            </svg>
            <span className="text-lg font-bold text-[#e0e0e0]">AXIOM</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            <Link href="/dashboard" className="text-[#8888a0] hover:text-[#e0e0e0] text-sm font-medium transition">
              Feed
            </Link>
            <Link href="/dashboard/technical" className="text-[#8888a0] hover:text-[#e0e0e0] text-sm font-medium transition">
              Technical
            </Link>
            <Link href="/dashboard/stocks" className="text-[#4fc3f7] hover:text-[#81d4fa] text-sm font-bold transition">
              🚀 Hisse Analizi
            </Link>
            <Link href="/dashboard/portfolio" className="text-[#8888a0] hover:text-[#e0e0e0] text-sm font-medium transition">
              Portfolio
            </Link>
            <Link href="/dashboard/signals" className="text-[#8888a0] hover:text-[#e0e0e0] text-sm font-medium transition">
              Signals
            </Link>
            <Link href="/dashboard/crypto" className="text-[#8888a0] hover:text-[#e0e0e0] text-sm font-medium transition">
              🔬 Crypto Intel
            </Link>
            <Link href="/dashboard/settings" className="text-[#8888a0] hover:text-[#e0e0e0] text-sm font-medium transition">
              Settings
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {/* Social Links */}
            <div className="flex items-center gap-1">
              <a
                href="https://x.com/Theaxiom_io"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AXIOM on X"
                title="AXIOM on X (@Theaxiom_io)"
                className="p-1.5 rounded text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#2a2a3e] transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://t.me/axiom_bot"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AXIOM Telegram Bot"
                title="AXIOM Telegram Bot (@axiom_bot)"
                className="p-1.5 rounded text-[#8888a0] hover:text-[#4fc3f7] hover:bg-[#2a2a3e] transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
            </div>

            {user && <QuotaBadge tier={user.tier} />}

            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-medium text-[#e0e0e0]">
                    {user.username || user.telegram_id}
                  </p>
                  <p className="text-xs text-[#555570]">@{user.telegram_id}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1.5 hover:bg-[#2a2a3e] rounded transition"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 text-[#8888a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1 text-xs font-medium text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#2a2a3e] rounded transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-3 border-t border-[#2a2a3e] space-y-1">
            <Link href="/dashboard" className="block px-3 py-1.5 text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#2a2a3e] rounded text-sm transition">Feed</Link>
            <Link href="/dashboard/technical" className="block px-3 py-1.5 text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#2a2a3e] rounded text-sm transition">Technical</Link>
            <Link href="/dashboard/stocks" className="block px-3 py-1.5 text-[#4fc3f7] hover:text-[#81d4fa] hover:bg-[#2a2a3e] rounded text-sm font-bold transition">🚀 Hisse Analizi</Link>
            <Link href="/dashboard/portfolio" className="block px-3 py-1.5 text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#2a2a3e] rounded text-sm transition">Portfolio</Link>
            <Link href="/dashboard/signals" className="block px-3 py-1.5 text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#2a2a3e] rounded text-sm transition">Signals</Link>
            <Link href="/dashboard/settings" className="block px-3 py-1.5 text-[#8888a0] hover:text-[#e0e0e0] hover:bg-[#2a2a3e] rounded text-sm transition">Settings</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
