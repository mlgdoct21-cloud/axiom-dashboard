'use client';

import { ReactNode } from 'react';

interface CalculatorCardProps {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
  locale?: 'en' | 'tr';
}

export default function CalculatorCard({
  title,
  description,
  icon,
  children,
  locale = 'en',
}: CalculatorCardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/30 transition-smooth">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="text-3xl">{icon}</div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-6"></div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
