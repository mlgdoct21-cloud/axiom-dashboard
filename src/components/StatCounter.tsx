'use client';

import { useState, useEffect, useRef } from 'react';

interface StatCounterProps {
  endValue: number;
  label: string;
  suffix?: string;
  duration?: number; // milliseconds
  useLocale?: 'en' | 'tr';
}

export default function StatCounter({
  endValue,
  label,
  suffix = '',
  duration = 2000,
  useLocale = 'en',
}: StatCounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const increment = endValue / (duration / 16); // 60fps
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= endValue) {
        setCount(endValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, endValue, duration]);

  const formattedCount = useLocale === 'tr'
    ? count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : count.toLocaleString('en-US');

  return (
    <div
      ref={ref}
      className="p-6 rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 text-center hover:border-cyan-500/30 transition-smooth"
    >
      <div className="text-3xl font-bold text-cyan-400 mb-2">
        {formattedCount}
        <span className="text-xl text-slate-400">{suffix}</span>
      </div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
