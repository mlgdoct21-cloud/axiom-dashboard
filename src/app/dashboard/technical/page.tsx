'use client';

import { useState } from 'react';
import { PriceChart } from '@/components/PriceChart';
import { TechnicalIndicators } from '@/components/TechnicalIndicators';
import { SignalCard } from '@/components/SignalCard';

type Period = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'AAPL', 'MSFT', 'GOOGL', 'TSLA'];

export default function TechnicalAnalysisPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1d');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Technical Analysis 📊
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Real-time charts, indicators, and trading signals
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {/* Symbol Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Select Symbol
          </label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedSymbol === symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Time Period
          </label>
          <div className="flex flex-wrap gap-2">
            {(['1h', '4h', '1d', '1w'] as Period[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Chart (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Price Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Price Chart - {selectedSymbol}
            </h2>
            <PriceChart
              symbol={selectedSymbol}
              period={selectedPeriod}
              height={400}
            />
          </div>

          {/* Technical Indicators */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Technical Indicators - {selectedSymbol}
            </h2>
            <TechnicalIndicators symbol={selectedSymbol} />
          </div>
        </div>

        {/* Right Column: Signal (1/3 width) */}
        <div>
          {/* Trading Signal */}
          <div className="sticky top-20">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Trading Signal
            </h2>
            <SignalCard symbol={selectedSymbol} />

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>💡 Note:</strong> Signals are based on technical analysis and should not be used
                as financial advice. Always do your own research before trading.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">📊 How to Use</h3>
        <ul className="text-sm text-gray-700 dark:text-gray-400 space-y-1">
          <li>• <strong>RSI:</strong> Values below 30 indicate oversold (potential BUY), above 70 indicate overbought (potential SELL)</li>
          <li>• <strong>MACD:</strong> Positive histogram indicates bullish momentum, negative indicates bearish</li>
          <li>• <strong>Bollinger Bands:</strong> Price near upper band suggests overbought, near lower band suggests oversold</li>
          <li>• <strong>Moving Averages:</strong> SMA20 above SMA50 indicates uptrend, below indicates downtrend</li>
        </ul>
      </div>
    </div>
  );
}
