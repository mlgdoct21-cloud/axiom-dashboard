'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  displaySymbol: string;
}

interface StockSearchProps {
  locale: 'en' | 'tr';
  onSelect?: (symbol: string) => void;
}

export default function StockSearch({ locale, onSelect }: StockSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setShowDropdown(true);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (symbol: string) => {
      setQuery('');
      setResults([]);
      setShowDropdown(false);

      if (onSelect) {
        onSelect(symbol);
      } else {
        router.push(`/dashboard/stocks/${symbol}`);
      }
    },
    [router, onSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={locale === 'tr' ? 'Hisse ara (ör: AAPL)' : 'Search stocks (e.g., AAPL)'}
          value={query}
          onChange={e => setQuery(e.target.value.toUpperCase())}
          onFocus={() => query && setShowDropdown(true)}
          className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-[#e0e0e0] placeholder-[#666680] focus:outline-none focus:border-[#4fc3f7] transition"
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="w-5 h-5 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map(result => (
            <button
              key={result.symbol}
              onClick={() => handleSelect(result.symbol)}
              className="w-full px-4 py-2.5 text-left hover:bg-[#2a2a3e] transition border-b border-[#2a2a3e] last:border-b-0 flex items-center justify-between"
            >
              <div className="min-w-0">
                <div className="font-semibold text-[#4fc3f7]">{result.symbol}</div>
                <div className="text-xs text-[#8888a0] truncate">{result.name}</div>
              </div>
              <span className="ml-2 text-[10px] text-[#666680] whitespace-nowrap">
                {result.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showDropdown && query && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4 text-center text-[#8888a0] text-sm z-50">
          {locale === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}
        </div>
      )}
    </div>
  );
}
