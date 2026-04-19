'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  value: number;
  pnl: number;
}

export default function PortfolioChart({ data, currency = 'USD' }: { data: ChartData[]; currency?: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">Portfolio Value Over Time</h3>

      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#999" />
            <YAxis stroke="#999" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: any) => `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              dot={false}
              strokeWidth={2}
              name="Portfolio Value"
            />
            <Line
              type="monotone"
              dataKey="pnl"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={2}
              name="P&L"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-80 text-gray-400">
          <p>No data available. Open some positions to see the chart.</p>
        </div>
      )}
    </div>
  );
}
