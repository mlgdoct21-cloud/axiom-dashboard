'use client';

import React from 'react';
import { DailyDigestData } from '@/hooks/useDailyDigest';

interface DailyDigestCardsProps {
  digest: DailyDigestData | null;
  loading: boolean;
  error: Error | null;
}

const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
  red: {
    bg: 'bg-red-950/30',
    border: 'border-red-600/50',
    icon: '🔴',
  },
  yellow: {
    bg: 'bg-yellow-950/30',
    border: 'border-yellow-600/50',
    icon: '🟡',
  },
  green: {
    bg: 'bg-green-950/30',
    border: 'border-green-600/50',
    icon: '🟢',
  },
  blue: {
    bg: 'bg-blue-950/30',
    border: 'border-blue-600/50',
    icon: '🔵',
  },
};

function CardSkeleton() {
  return (
    <div className="border border-gray-700/50 rounded-lg p-4 bg-gray-900/50 animate-pulse h-48">
      <div className="h-6 bg-gray-700/50 rounded w-3/4 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-700/50 rounded w-full" />
        <div className="h-4 bg-gray-700/50 rounded w-5/6" />
        <div className="h-4 bg-gray-700/50 rounded w-4/5" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-6 bg-gray-700/50 rounded-full w-12" />
        <div className="h-6 bg-gray-700/50 rounded-full w-12" />
      </div>
    </div>
  );
}

function Card({
  title,
  text,
  symbols,
  color = 'blue',
}: {
  title: string;
  text?: string;
  symbols?: string[];
  color?: 'red' | 'yellow' | 'green' | 'blue';
}) {
  const { bg, border, icon } = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`border rounded-lg p-4 ${bg} ${border} transition-all duration-300 hover:border-opacity-100`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
      </div>

      {/* Content */}
      {text && <p className="text-xs text-gray-300 leading-relaxed mb-4 line-clamp-4">{text}</p>}

      {/* Symbols */}
      {symbols && symbols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {symbols.slice(0, 4).map((symbol) => (
            <span
              key={symbol}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700/50 text-gray-200 border border-gray-600/50 hover:border-gray-500 cursor-pointer transition-colors"
            >
              {symbol}
            </span>
          ))}
          {symbols.length > 4 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-gray-400">
              +{symbols.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DailyDigestCards({ digest, loading, error }: DailyDigestCardsProps) {
  if (error && !digest) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="col-span-full bg-red-950/30 border border-red-600/50 rounded-lg p-4">
          <p className="text-xs text-red-300">
            ⚠️ Digest yüklenemedi. Lütfen daha sonra tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !digest) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!digest) {
    return null;
  }

  const { risk_radar, quant_analysis, portfolio_signal, last_updated } = digest;

  return (
    <div className="mb-6">
      {/* Title + Refresh Time */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">📊 Günün Özeti ve Axiom Teşpiti</h2>
        {last_updated && (
          <span className="text-xs text-gray-500">
            🔄 {new Date(last_updated).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {/* 3-Column Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title={risk_radar?.title || 'RISK RADAR'}
          text={risk_radar?.analysis}
          symbols={risk_radar?.symbols}
          color={(risk_radar?.color as any) || 'red'}
        />
        <Card
          title={quant_analysis?.title || 'KANTITATIF ANALIZ'}
          text={quant_analysis?.trigger}
          symbols={quant_analysis?.symbols}
          color={(quant_analysis?.color as any) || 'green'}
        />
        <Card
          title={portfolio_signal?.title || 'PORTFÖY SINYAL'}
          text={portfolio_signal?.recommendation}
          symbols={portfolio_signal?.symbols}
          color={(portfolio_signal?.color as any) || 'blue'}
        />
      </div>
    </div>
  );
}
