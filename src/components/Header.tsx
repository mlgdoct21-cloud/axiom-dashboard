'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useState } from 'react';

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
