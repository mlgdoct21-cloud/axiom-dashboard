'use client';

import React, { useState } from 'react';

/**
 * AXIOM v3.0 Stock Analysis Component
 * Displays multi-agent analysis results with professional UI
 */

interface V3AnalysisResult {
  symbol: string;
  decision: 'AL' | 'SAT' | 'TUT' | 'İZLE';
  weightedScore: number;

  fundamentalScore: number;
  macroScore: number;
  technicalScore: number;
  dataQualityScore: number;

  regime: string;
  regimeStrength: string;
  timeHorizon: string;
  adx: number;
  chop: number;

  entryZone: { lower: number; upper: number };
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;

  positionSize: {
    finalPosition: number;
    maxDailyLoss: number;
  };

  bullCase: string[];
  bearCase: Array<{
    scenario: string;
    trigger: string;
    probability: number;
    impact: string;
  }>;

  stressTest: {
    passCount: number;
    failCount: number;
    recommendation: string;
  };

  support: number[];
  resistance: number[];

  confidenceLevel: number;
  caveat: string;
  timestamp: number;
}

interface Props {
  symbol: string;
  currentPrice: number;
  analysis?: V3AnalysisResult;
  isLoading?: boolean;
  error?: string;
}

const ScoreCard: React.FC<{
  title: string;
  score: number;
  description: string;
  color: string;
}> = ({ title, score, description, color }) => {
  const bgColor = color === 'green' ? 'bg-green-500/10' : color === 'blue' ? 'bg-blue-500/10' : 'bg-yellow-500/10';
  const textColor = color === 'green' ? 'text-green-400' : color === 'blue' ? 'text-blue-400' : 'text-yellow-400';

  return (
    <div className={`${bgColor} border border-${color}-500/30 rounded-lg p-4`}>
      <div className="text-sm text-gray-400 mb-2">{title}</div>
      <div className={`text-3xl font-bold ${textColor}`}>{score}</div>
      <div className="text-xs text-gray-500 mt-2">{description}</div>
    </div>
  );
};

const DecisionBadge: React.FC<{ decision: string; score: number }> = ({ decision, score }) => {
  let bgColor = 'bg-gray-500/20';
  let textColor = 'text-gray-300';
  let icon = null;

  if (decision === 'AL') {
    bgColor = 'bg-green-500/20';
    textColor = 'text-green-300';
    icon = <span className="text-xl">📈</span>;
  } else if (decision === 'SAT') {
    bgColor = 'bg-red-500/20';
    textColor = 'text-red-300';
    icon = <span className="text-xl">📉</span>;
  } else if (decision === 'TUT') {
    bgColor = 'bg-blue-500/20';
    textColor = 'text-blue-300';
  } else {
    bgColor = 'bg-yellow-500/20';
    textColor = 'text-yellow-300';
  }

  const labels: Record<string, string> = {
    AL: 'SATINAL AL',
    SAT: 'SAT',
    TUT: 'TUTA TUT',
    İZLE: 'İZLE',
  };

  return (
    <div className={`${bgColor} border border-${textColor} rounded-full px-6 py-3 flex items-center gap-2`}>
      {icon}
      <div>
        <div className={`${textColor} font-bold`}>{labels[decision] || decision}</div>
        <div className="text-xs text-gray-400">Skor: {score.toFixed(1)}/100</div>
      </div>
    </div>
  );
};

export default function StockAnalysisV3Tab({
  symbol,
  currentPrice,
  analysis,
  isLoading = false,
  error,
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'bullbear' | 'stress' | 'risk'>('overview');

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 mt-4">Analiz yapılıyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-300 mb-2">
          <span className="text-xl">⚠️</span>
          Hata
        </div>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 text-center text-gray-400">
        Analiz verisi bulunamadı. Hisse seçerek başlayın.
      </div>
    );
  }

  const decisionColor = {
    AL: 'text-green-400',
    SAT: 'text-red-400',
    TUT: 'text-blue-400',
    İZLE: 'text-yellow-400',
  }[analysis.decision];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{symbol}</h2>
          <p className="text-gray-400">AXIOM v3.0 Çoklu-Ajan Analizi</p>
        </div>
        <DecisionBadge decision={analysis.decision} score={analysis.weightedScore} />
      </div>

      {/* Data Quality Alert */}
      {analysis.dataQualityScore < 80 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-300 mb-2">
            <span className="text-xl">⚠️</span>
            Veri Kalitesi Uyarısı
          </div>
          <p className="text-sm text-gray-400">
            Veri kalitesi {analysis.dataQualityScore}/100 - Analiz sonuçları dikkatli kullanılmalıdır.
          </p>
        </div>
      )}

      {/* 4 Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title="Temel Analiz"
          score={analysis.fundamentalScore}
          description="P/E, ROE, Büyüme"
          color="green"
        />
        <ScoreCard
          title="Makro & Sektör"
          score={analysis.macroScore}
          description="Fed, Enflasyon, Beta"
          color="blue"
        />
        <ScoreCard
          title="Teknik Analiz"
          score={analysis.technicalScore}
          description={`ADX: ${analysis.adx} | CHOP: ${analysis.chop.toFixed(0)}`}
          color="purple"
        />
        <ScoreCard
          title="Ağırlıklı Skor"
          score={Math.round(analysis.weightedScore)}
          description={analysis.timeHorizon === 'LONG_TERM' ? 'Uzun Vadeli' : analysis.timeHorizon === 'SHORT_TERM' ? 'Kısa Vadeli' : 'Orta Vadeli'}
          color="green"
        />
      </div>

      {/* Price Targets & Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2">GİRİŞ BÖLGESİ</div>
          <div className="text-lg font-bold text-blue-300">
            ${analysis.entryZone.lower.toFixed(2)} - ${analysis.entryZone.upper.toFixed(2)}
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2">HEDEF FİYAT</div>
          <div className="text-lg font-bold text-green-300">${analysis.targetPrice.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((analysis.targetPrice - currentPrice) / currentPrice * 100).toFixed(1)}% yukarı
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2">STOP LOSS</div>
          <div className="text-lg font-bold text-red-300">${analysis.stopLoss.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">
            R:R = {analysis.riskRewardRatio.toFixed(1)}:1
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-4">
          {(['overview', 'bullbear', 'stress', 'risk'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'overview' && 'Genel Bakış'}
              {tab === 'bullbear' && 'Bull/Bear'}
              {tab === 'stress' && 'Stress Test'}
              {tab === 'risk' && 'Risk Yönetimi'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <>
            <div>
              <h3 className="text-sm font-bold text-gray-300 mb-2">Rejim & Zaman Ufku</h3>
              <p className="text-gray-400 text-sm">
                Rejim: <span className="text-blue-300">{analysis.regime}</span> ({analysis.regimeStrength}) | Zaman Ufku: <span className="text-blue-300">{analysis.timeHorizon}</span>
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-300 mb-2">Destek & Direnç</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Destek Seviyeleri</p>
                  {analysis.support.map((level, i) => (
                    <p key={i} className="text-sm text-green-400">
                      ${level.toFixed(2)}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Direnç Seviyeleri</p>
                  {analysis.resistance.map((level, i) => (
                    <p key={i} className="text-sm text-red-400">
                      ${level.toFixed(2)}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-300 mb-2">Güven Seviyesi</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(analysis.confidenceLevel / 10) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-blue-300">{analysis.confidenceLevel.toFixed(1)}/10</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-gray-300">💡 {analysis.caveat}</p>
            </div>
          </>
        )}

        {activeTab === 'bullbear' && (
          <>
            <div>
              <h3 className="text-sm font-bold text-green-300 mb-2">✓ Bull Case (Neden AL?)</h3>
              <ul className="space-y-2">
                {analysis.bullCase.map((point, i) => (
                  <li key={i} className="text-sm text-gray-400">
                    • {point}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-red-300 mb-2">✕ Bear Case (Riskler)</h3>
              <div className="space-y-2">
                {analysis.bearCase.map((scenario, i) => (
                  <div key={i} className="text-sm bg-red-500/10 border border-red-500/30 rounded p-2">
                    <p className="text-red-300 font-bold">{scenario.scenario}</p>
                    <p className="text-gray-400">{scenario.trigger}</p>
                    <p className="text-xs text-gray-500">
                      Etki: {scenario.impact} | Olasılık: {(scenario.probability * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'stress' && (
          <>
            <h3 className="text-sm font-bold text-gray-300 mb-2">Stress Test Sonuçları</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                <p className="text-xs text-gray-400">Geçti</p>
                <p className="text-2xl font-bold text-green-300">{analysis.stressTest.passCount}/3</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                <p className="text-xs text-gray-400">Başarısız</p>
                <p className="text-2xl font-bold text-red-300">{analysis.stressTest.failCount}/3</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                <p className="text-xs text-gray-400">Tavsiye</p>
                <p className="text-lg font-bold text-blue-300">{analysis.stressTest.recommendation}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              3 senaryo test edildi: Faiz Şoku, Sektörel Headwind, Earnings Miss
            </p>
          </>
        )}

        {activeTab === 'risk' && (
          <>
            <div>
              <h3 className="text-sm font-bold text-gray-300 mb-3">Pozisyon Yönetimi</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-700/20 rounded">
                  <span className="text-sm text-gray-400">Pozisyon Boyutu</span>
                  <span className="font-bold text-white">{analysis.positionSize.finalPosition.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/20 rounded">
                  <span className="text-sm text-gray-400">Max Günlük Kayıp</span>
                  <span className="font-bold text-red-300">${analysis.positionSize.maxDailyLoss.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-bold text-yellow-300 mb-2">⚠️ Trailing Stop Aktif</h4>
              <p className="text-xs text-gray-400">
                Kâr +3% → Stop +$3 yukarı çıkacak. Tüm kârınızı korur.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-700">
        Analiz: {new Date(analysis.timestamp).toLocaleString('tr-TR')} | Veri Kalitesi: {analysis.dataQualityScore}/100
      </div>
    </div>
  );
}
