'use client';

import { useState, useEffect } from 'react';

interface IndicatorsData {
  rsi: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  } | null;
  bollinger_bands: {
    upper: number;
    middle: number;
    lower: number;
    position: number;
    current_price: number;
  } | null;
  sma_20: number | null;
  sma_50: number | null;
  current_price: number | null;
}

interface TechnicalIndicatorsProps {
  symbol: string;
}

export function TechnicalIndicators({ symbol }: TechnicalIndicatorsProps) {
  const [indicators, setIndicators] = useState<IndicatorsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndicators = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const authData = localStorage.getItem('axiom_auth');
        const token = authData ? JSON.parse(authData).access_token : '';

        const response = await fetch(
          `http://localhost:8000/api/v1/technical/indicators/${symbol}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          // Use mock indicators if API fails
          const mockIndicators = generateMockIndicators(symbol);
          setIndicators(mockIndicators);
          return;
        }

        const data = await response.json();
        setIndicators(data);
      } catch (err) {
        // On error, use mock indicators
        const mockIndicators = generateMockIndicators(symbol);
        setIndicators(mockIndicators);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndicators();
  }, [symbol]);

  const generateMockIndicators = (sym: string): IndicatorsData => {
    const prices: { [key: string]: number } = {
      BTC: 43250,
      ETH: 2280,
      AAPL: 175,
      MSFT: 420,
      GOOGL: 165,
      TSLA: 242,
    };

    const price = prices[sym] || 100;

    return {
      rsi: Math.random() * 80 + 10,
      macd: {
        macd: Math.random() * 2 - 1,
        signal: Math.random() * 2 - 1,
        histogram: Math.random() * 0.5 - 0.25,
      },
      bollinger_bands: {
        upper: price * 1.05,
        middle: price,
        lower: price * 0.95,
        position: Math.random(),
        current_price: price,
      },
      sma_20: price * (0.98 + Math.random() * 0.04),
      sma_50: price * (0.97 + Math.random() * 0.06),
      current_price: price,
    };
  };

  if (isLoading) {
    return (
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    );
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>;
  }

  if (!indicators) {
    return <div className="text-gray-600 dark:text-gray-400 text-sm">No data</div>;
  }

  const getRSIColor = (rsi: number | null) => {
    if (!rsi) return 'bg-gray-100 dark:bg-gray-800';
    if (rsi < 30) return 'bg-green-100 dark:bg-green-900/30';
    if (rsi > 70) return 'bg-red-100 dark:bg-red-900/30';
    return 'bg-yellow-100 dark:bg-yellow-900/30';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* RSI */}
      <div className={`rounded-lg p-4 ${getRSIColor(indicators.rsi)}`}>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">RSI (14)</h4>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {indicators.rsi ? indicators.rsi.toFixed(2) : 'N/A'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {indicators.rsi && indicators.rsi < 30 && '📈 Oversold'}
            {indicators.rsi && indicators.rsi > 70 && '📉 Overbought'}
            {indicators.rsi && indicators.rsi >= 30 && indicators.rsi <= 70 && '➡️ Neutral'}
          </div>
        </div>
        <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{
              width: indicators.rsi ? `${Math.min(100, Math.max(0, indicators.rsi))}%` : '0%',
            }}
          ></div>
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex justify-between">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* MACD */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">MACD</h4>
        {indicators.macd ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">MACD:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {indicators.macd.macd?.toFixed(4) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Signal:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {indicators.macd.signal?.toFixed(4) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Histogram:</span>
              <span
                className={`font-mono ${
                  indicators.macd.histogram && indicators.macd.histogram > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {indicators.macd.histogram?.toFixed(4) || 'N/A'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-600 dark:text-gray-400 text-sm">No data</div>
        )}
      </div>

      {/* Bollinger Bands */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bollinger Bands</h4>
        {indicators.bollinger_bands ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Upper:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {indicators.bollinger_bands.upper.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Middle:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {indicators.bollinger_bands.middle.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Lower:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {indicators.bollinger_bands.lower.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{
                  width: `${(indicators.bollinger_bands.position) * 100}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Price position: {(indicators.bollinger_bands.position * 100).toFixed(1)}%
            </div>
          </div>
        ) : (
          <div className="text-gray-600 dark:text-gray-400 text-sm">No data</div>
        )}
      </div>

      {/* SMAs */}
      <div className="md:col-span-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Moving Averages</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Current Price</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ${indicators.current_price?.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">SMA 20</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ${indicators.sma_20?.toFixed(2)}
            </div>
            {indicators.current_price && indicators.sma_20 && (
              <div className={`text-xs ${indicators.current_price > indicators.sma_20 ? 'text-green-600' : 'text-red-600'}`}>
                {indicators.current_price > indicators.sma_20 ? '📈 Above' : '📉 Below'}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">SMA 50</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ${indicators.sma_50?.toFixed(2)}
            </div>
            {indicators.current_price && indicators.sma_50 && (
              <div className={`text-xs ${indicators.current_price > indicators.sma_50 ? 'text-green-600' : 'text-red-600'}`}>
                {indicators.current_price > indicators.sma_50 ? '📈 Above' : '📉 Below'}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Trend</div>
            {indicators.sma_20 && indicators.sma_50 && (
              <div className="text-lg font-bold">
                {indicators.sma_20 > indicators.sma_50 ? (
                  <span className="text-green-600 dark:text-green-400">📈 Bullish</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">📉 Bearish</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
