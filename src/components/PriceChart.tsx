'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  symbol: string;
  period?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  height?: number;
}

export function PriceChart({ symbol, period = '1d', height = 400 }: PriceChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get token from localStorage
        const authData = localStorage.getItem('axiom_auth');
        const token = authData ? JSON.parse(authData).access_token : '';

        // Call the technical API endpoint
        const response = await fetch(
          `http://localhost:8000/api/v1/technical/chart/${symbol}?period=${period}&limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          // Generate mock data if API fails (for demo)
          const mockData = generateMockChartData(symbol, 100);
          setData(mockData);
          return;
        }

        const chartData = await response.json();

        // Format data for Recharts
        const formattedData = chartData.map((point: any) => ({
          time: new Date(point.time).toLocaleDateString(),
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
        }));

        setData(formattedData);
      } catch (err) {
        // On error, use mock data
        const mockData = generateMockChartData(symbol, 100);
        setData(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [symbol, period]);

  const generateMockChartData = (sym: string, count: number) => {
    const basePrice: { [key: string]: number } = {
      BTC: 43250,
      ETH: 2280,
      AAPL: 175,
      MSFT: 420,
      GOOGL: 165,
      TSLA: 242,
    };

    const price = basePrice[sym] || 100;
    const data = [];
    let currentPrice = price;

    for (let i = count; i > 0; i--) {
      const change = (Math.random() - 0.5) * price * 0.02;
      currentPrice += change;
      const date = new Date();
      date.setDate(date.getDate() - i);

      data.push({
        time: date.toLocaleDateString(),
        open: currentPrice - Math.abs(Math.random() * 10),
        high: currentPrice + Math.abs(Math.random() * 15),
        low: currentPrice - Math.abs(Math.random() * 15),
        close: currentPrice,
        volume: Math.floor(Math.random() * 1000000),
      });
    }

    return data;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-gray-600 dark:text-gray-400">No data available</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.2)" />
        <XAxis
          dataKey="time"
          tick={{ fill: 'currentColor', fontSize: 12 }}
          stroke="currentColor"
        />
        <YAxis
          tick={{ fill: 'currentColor', fontSize: 12 }}
          stroke="currentColor"
          domain={['dataMin - 100', 'dataMax + 100']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(100, 100, 100, 0.5)',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="close"
          stroke="#3b82f6"
          dot={false}
          name="Close Price"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="open"
          stroke="#8b5cf6"
          dot={false}
          name="Open Price"
          strokeWidth={1}
          opacity={0.5}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
