'use client';

import { useEffect, useState } from 'react';
import { apiClient, type AcademyGlossaryEntry } from '@/lib/api';

type Hit = AcademyGlossaryEntry & { section: string };

export default function GlossarySearchBar() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      apiClient
        .searchAcademyGlossary(term)
        .then((res) => {
          if (!cancelled) {
            setHits(res.results);
            setOpen(true);
          }
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="📖 Sözlükte ara: theta, gamma flip, collar…"
        className="w-full px-4 py-2.5 rounded-lg bg-[#161629] border border-[#26314a] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4fc3f7]"
      />
      {open && hits.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#26314a] bg-[#161629] shadow-xl max-h-80 overflow-auto">
          {hits.map((h, i) => (
            <a
              key={`${h.section}-${h.slug}-${i}`}
              href={`#sozluk-${h.slug}`}
              onMouseDown={(e) => e.preventDefault()}
              className="block px-4 py-3 hover:bg-[#26314a]/40 border-b border-[#26314a]/40 last:border-b-0"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-white">
                  {h.tr || h.slug}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">
                  {h.section}
                </span>
              </div>
              {h.intuition && (
                <p className="text-xs text-gray-400 italic line-clamp-2">{h.intuition}</p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
