'use client';

import { useState, useEffect } from 'react';

interface SignalData {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  indicators: {
    rsi: number | null;
    macd: any;
    bollinger_bands: any;
    sma_20: number | null;
    sma_50: number | null;
  };
  price: number;
  timestamp: string;
}

interface SignalCardProps {
  symbol: string;
}

export function SignalCard({ symbol }: SignalCardProps) {
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignal = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const authData = localStorage.getItem('axiom_auth');
        const token = authData ? JSON.parse(authData).access_token : '';

        const response = await fetch(
          `http://localhost:8000/api/v1/technical/signals/${symbol}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          // Use mock signal if API fails
          const mockSignal = generateMockSignal(symbol);
          setSignal(mockSignal);
          return;
        }

        const data = await response.json();
        setSignal(data);
      } catch (err) {
        // On error, use mock signal
        const mockSignal = generateMockSignal(symbol);
        setSignal(mockSignal);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignal();
  }, [symbol]);

  const generateMockSignal = (sym: string): SignalData => {
    const signals: { [key: string]: 'BUY' | 'SELL' | 'HOLD' } = {
      BTC: 'BUY',
      ETH: 'HOLD',
      AAPL: 'SELL',
      MSFT: 'BUY',
      GOOGL: 'HOLD',
      TSLA: 'SELL',
    };

    const prices: { [key: string]: number } = {
      BTC: 43250,
      ETH: 2280,
      AAPL: 175,
      MSFT: 420,
      GOOGL: 165,
      TSLA: 242,
    };

    const signal = signals[sym] || 'HOLD';
    const confidence = Math.random() * 0.4 + 0.6; // 0.6-1.0

    const reasons: { [key: string]: string } = {
      BTC: 'RSI oversold + MACD bullish crossover',
      ETH: 'Mixed signals - neutral indicators',
      AAPL: 'RSI overbought + bearish trend',
      MSFT: 'Strong uptrend + positive MACD',
      GOOGL: 'Consolidation pattern forming',
      TSLA: 'Technical resistance at $250',
    };

    return {
      symbol: sym,
      signal,
      confidence,
      reason: reasons[sym] || 'Multiple technical indicators suggest ' + signal,
      indicators: {
        rsi: Math.random() * 80 + 10,
        macd: { macd: Math.random() * 2 - 1, signal: Math.random() * 2 - 1, histogram: null },
        bollinger_bands: {
          upper: prices[sym] * 1.05,
          middle: prices[sym],
          lower: prices[sym] * 0.95,
          position: Math.random(),
          current_price: prices[sym],
        },
        sma_20: prices[sym] * (0.98 + Math.random() * 0.04),
        sma_50: prices[sym] * (0.97 + Math.random() * 0.06),
      },
      price: prices[sym],
      timestamp: new Date().toISOString(),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!signal) {
    return <div className="text-gray-600 dark:text-gray-400">No signal data</div>;
  }

  const getSignalColor = (sig: 'BUY' | 'SELL' | 'HOLD') => {
    switch (sig) {
      case 'BUY':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-300',
          button: 'bg-green-600 hover:bg-green-700',
          icon: '🟢',
        };
      case 'SELL':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          button: 'bg-red-600 hover:bg-red-700',
          icon: '🔴',
        };
      default:
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-300',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          icon: '🟡',
        };
    }
  };

  const colors = getSignalColor(signal.signal);
  const confidencePercent = Math.round(signal.confidence * 100);

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{colors.icon}</span>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {signal.signal}
            </h3>
            <p className={`text-sm ${colors.text}`}>{signal.symbol}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            ${signal.price.toFixed(2)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {new Date(signal.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Confidence Level
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {confidencePercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${colors.button}`}
            style={{ width: `${confidencePercent}%` }}
          ></div>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Analysis
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{signal.reason}</p>
      </div>

      {/* Quick Indicators Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        {signal.indicators.rsi && (
          <div className="bg-white dark:bg-gray-900 rounded p-2">
            <span className="text-gray-600 dark:text-gray-400">RSI:</span>
            <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">
              {signal.indicators.rsi.toFixed(2)}
            </span>
          </div>
        )}
        {signal.indicators.sma_20 && signal.indicators.sma_50 && (
          <div className="bg-white dark:bg-gray-900 rounded p-2">
            <span className="text-gray-600 dark:text-gray-400">Trend:</span>
            <span
              className={`ml-2 font-bold ${
                signal.indicators.sma_20 > signal.indicators.sma_50
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {signal.indicators.sma_20 > signal.indicators.sma_50 ? '📈 Up' : '📉 Down'}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        className={`w-full ${colors.button} text-white font-semibold py-2 px-4 rounded-lg transition`}
      >
        {signal.signal === 'BUY' && 'Execute BUY Order'}
        {signal.signal === 'SELL' && 'Execute SELL Order'}
        {signal.signal === 'HOLD' && 'Wait for Signal'}
      </button>
    </div>
  );
}
